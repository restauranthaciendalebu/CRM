export function getOptimizedImageUrl(url: string, width: number, quality = 72) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "images.unsplash.com") {
      parsed.searchParams.set("w", String(width));
      parsed.searchParams.set("q", String(quality));
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", "crop");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
