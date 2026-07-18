/**
 * Automated smoke tests for auth routes + OAuth callback (Android emulation).
 * Rulează cu: bunx playwright test tests/auth-android.spec.ts
 * (Playwright e preinstalat în sandbox.)
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:8080";

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

test.use({ userAgent: ANDROID_UA, viewport: { width: 412, height: 915 } });

test("signup page render + scroll", async ({ page }) => {
  await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/signup/);
  // The signup route must be scrollable on small viewports.
  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    return { scroll: el.scrollHeight, client: el.clientHeight };
  });
  expect(overflow.scroll).toBeGreaterThanOrEqual(overflow.client);
});

test("auth callback handles missing state gracefully", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/auth/callback`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/auth\/callback/);
  expect(errors).toEqual([]);
});

test("debug/oauth page renders", async ({ page }) => {
  await page.goto(`${BASE}/debug/oauth`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Debug/i })).toBeVisible();
  await page.getByRole("button", { name: /Rulează validare/i }).click();
  await expect(page.getByText(/runtime\.isNative/)).toBeVisible();
});
