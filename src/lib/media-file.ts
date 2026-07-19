/** Detect image vs video from MIME and/or filename (Capacitor often leaves type empty). */
export function detectMediaKind(file: { name?: string; type?: string }): "image" | "video" {
  const mime = (file.type ?? "").toLowerCase().trim();
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";

  const name = (file.name ?? "").toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
  if (["mp4", "webm", "mov", "m4v", "avi", "mkv", "3gp"].includes(ext)) return "video";
  if (["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp"].includes(ext)) return "image";

  // Prefer image when unknown — matches DB default and photo-first UX
  return "image";
}

export function mediaContentType(file: File, kind: "image" | "video"): string {
  const mime = (file.type ?? "").trim();
  if (mime) return mime;
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const byExt: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/mp4",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
  };
  if (byExt[ext]) return byExt[ext];
  return kind === "video" ? "video/mp4" : "image/jpeg";
}

export function mediaFileExt(file: File, kind: "image" | "video"): string {
  const raw = file.name.split(".").pop()?.toLowerCase();
  if (raw && /^[a-z0-9]{2,5}$/.test(raw)) return raw;
  return kind === "video" ? "mp4" : "jpg";
}
