import { Capacitor } from "@capacitor/core";

/** Turn Capacitor / WebView file URIs into something fetch() can read. */
export async function resolveNativeMediaUrl(path: string): Promise<string> {
  if (!path) throw new Error("Lipsă fișier media");
  if (/^https?:\/\//i.test(path) || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }
  try {
    return Capacitor.convertFileSrc(path);
  } catch {
    return path;
  }
}

export async function uriToFile(
  path: string,
  fallbackName: string,
  fallbackType: string,
): Promise<File> {
  const fetchPath = await resolveNativeMediaUrl(path);
  const res = await fetch(fetchPath);
  if (!res.ok) throw new Error(`Nu pot citi media (${res.status})`);
  const blob = await res.blob();
  const type = blob.type || fallbackType;
  const ext = type.includes("mp4")
    ? "mp4"
    : type.includes("webm")
      ? "webm"
      : type.includes("png")
        ? "png"
        : type.includes("jpeg") || type.includes("jpg")
          ? "jpg"
          : type.includes("webp")
            ? "webp"
            : fallbackName.split(".").pop() || "bin";
  return new File([blob], `spritz-${Date.now()}.${ext}`, { type });
}
