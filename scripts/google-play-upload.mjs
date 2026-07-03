#!/usr/bin/env bun
import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ALLOWED_TRACKS = new Set(["internal", "alpha", "beta", "production"]);
const ALLOWED_STATUSES = new Set(["draft", "inProgress", "completed", "halted"]);

function fail(message) {
  console.error(`EROARE: ${message}`);
  process.exit(1);
}

function base64url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function env(name, fallback = "") {
  return process.env[name] && process.env[name].trim() ? process.env[name].trim() : fallback;
}

async function readJsonMaybeBase64() {
  const file = env("GOOGLE_PLAY_SERVICE_ACCOUNT_FILE");
  const base64 = env("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64");
  const raw = env("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");

  if (file) return JSON.parse(await readFile(file, "utf8"));
  if (base64) return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
  if (raw) return JSON.parse(raw);

  fail("Lipsește GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 / GOOGLE_PLAY_SERVICE_ACCOUNT_JSON / GOOGLE_PLAY_SERVICE_ACCOUNT_FILE.");
}

async function getAccessToken(serviceAccount) {
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    fail("Service account JSON invalid: lipsesc client_email sau private_key.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: ANDROID_PUBLISHER_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64url(signer.sign(serviceAccount.private_key));

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });

  const body = await response.text();
  if (!response.ok) fail(`Google auth a respins service account-ul (${response.status}): ${body}`);
  return JSON.parse(body).access_token;
}

async function googleJson({ token, method, url, body }) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    const hint = response.status === 403 || response.status === 404
      ? " Verifică dacă aplicația există în Google Play, API access este legat, iar service account-ul are drept de Release manager. Pentru o aplicație complet nouă, Google poate cere primul draft creat în Play Console."
      : "";
    fail(`Google Play API a eșuat (${response.status}) pe ${method} ${url}: ${text}${hint}`);
  }
  return text ? JSON.parse(text) : {};
}

async function googleUploadBundle({ token, packageName, editId, aabPath }) {
  const bytes = await readFile(aabPath);
  const url = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/edits/${encodeURIComponent(editId)}/bundles?uploadType=media`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body: bytes,
  });
  const text = await response.text();
  if (!response.ok) {
    const hint = response.status === 403 || response.status === 404
      ? " Verifică pachetul com.oxidatii.app, Play App Signing și drepturile service account-ului."
      : "";
    fail(`Upload AAB eșuat (${response.status}): ${text}${hint}`);
  }
  return JSON.parse(text);
}

async function readReleaseNotes() {
  const notesPath = path.resolve("android/whatsnew/whatsnew-ro-RO");
  if (!existsSync(notesPath)) return [];
  const text = (await readFile(notesPath, "utf8")).trim();
  if (!text) return [];
  return [{ language: "ro-RO", text: text.slice(0, 500) }];
}

const packageName = env("GOOGLE_PLAY_PACKAGE_NAME", "com.oxidatii.app");
const track = env("GOOGLE_PLAY_TRACK", "internal");
const status = env("GOOGLE_PLAY_STATUS", "draft");
const aabPath = path.resolve(env("GOOGLE_PLAY_AAB_PATH", "android/app/build/outputs/bundle/release/app-release.aab"));
const releaseName = env("GOOGLE_PLAY_RELEASE_NAME", `Oxidatii ${new Date().toISOString().slice(0, 10)}`);

if (!ALLOWED_TRACKS.has(track)) fail(`GOOGLE_PLAY_TRACK invalid: ${track}. Folosește internal, alpha, beta sau production.`);
if (!ALLOWED_STATUSES.has(status)) fail(`GOOGLE_PLAY_STATUS invalid: ${status}. Folosește draft, inProgress, completed sau halted.`);
if (!existsSync(aabPath)) fail(`Nu găsesc AAB-ul: ${aabPath}`);

console.log(`-> Google Play upload: package=${packageName}, track=${track}, status=${status}`);

const serviceAccount = await readJsonMaybeBase64();
const token = await getAccessToken(serviceAccount);
const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}`;

const edit = await googleJson({ token, method: "POST", url: `${base}/edits`, body: {} });
console.log(`-> Edit creat: ${edit.id}`);

const bundle = await googleUploadBundle({ token, packageName, editId: edit.id, aabPath });
const versionCode = String(bundle.versionCode);
console.log(`-> Bundle urcat: versionCode=${versionCode}`);

const release = {
  name: releaseName,
  versionCodes: [versionCode],
  status,
};
const releaseNotes = await readReleaseNotes();
if (releaseNotes.length) release.releaseNotes = releaseNotes;

await googleJson({
  token,
  method: "PUT",
  url: `${base}/edits/${encodeURIComponent(edit.id)}/tracks/${encodeURIComponent(track)}`,
  body: { track, releases: [release] },
});
console.log(`-> Track actualizat: ${track}`);

await googleJson({
  token,
  method: "POST",
  url: `${base}/edits/${encodeURIComponent(edit.id)}:commit?changesNotSentForReview=false`,
  body: {},
});

console.log("OK: AAB-ul este trimis în Google Play.");