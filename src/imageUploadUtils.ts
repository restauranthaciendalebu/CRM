import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

// Downscales and re-encodes an uploaded photo client-side before it ever
// leaves the device, so a 12MP phone photo doesn't turn into a multi-MB
// Storage upload (and a slow, expensive one on a restaurant's wifi).
async function compressImageFile(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  return blob || file;
}

export async function uploadProductImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo seleccionado no es una imagen.");
  }
  const compressed = await compressImageFile(file);
  const fileName = `product-images/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
  const fileRef = ref(storage, fileName);
  await uploadBytes(fileRef, compressed, { contentType: "image/jpeg" });
  return getDownloadURL(fileRef);
}
