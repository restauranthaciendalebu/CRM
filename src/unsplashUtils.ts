export interface UnsplashPhotoResult {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  photographerName: string;
  photographerLink: string;
  downloadLocation: string;
}

function getAccessKey(): string {
  const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
  if (!key) {
    throw new Error(
      "Falta configurar VITE_UNSPLASH_ACCESS_KEY para poder buscar fotos reales."
    );
  }
  return key;
}

export async function searchUnsplashPhotos(query: string): Promise<UnsplashPhotoResult[]> {
  const accessKey = getAccessKey();
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&orientation=squarish`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });
  if (!res.ok) {
    throw new Error("No se pudo buscar fotos en este momento. Intenta de nuevo.");
  }
  const data = await res.json();
  return (data.results || []).map((photo: any) => ({
    id: photo.id,
    thumbUrl: photo.urls.small,
    fullUrl: `${photo.urls.raw}&w=900&auto=format&fit=crop&q=75`,
    photographerName: photo.user?.name || "Unsplash",
    photographerLink: photo.user?.links?.html || "https://unsplash.com",
    downloadLocation: photo.links.download_location,
  }));
}

// Unsplash's API guidelines require pinging this endpoint whenever a photo
// is actually put to use (not just previewed in search results).
export function trackUnsplashDownload(downloadLocation: string) {
  const accessKey = getAccessKey();
  void fetch(`${downloadLocation}&client_id=${accessKey}`).catch(() => {
    // Best-effort tracking ping — never block the photo selection on this.
  });
}
