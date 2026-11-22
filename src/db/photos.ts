import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, type Photo } from './db';
import { newId } from './ids';

const FULL_MAX = 1600;
const THUMB_MAX = 360;

/** Decodes a photo. createImageBitmap fails on some formats (e.g. iPhone HEIC in some
 * browsers), so fall back to an <img>, which Safari decodes natively (with EXIF rotation). */
async function decode(file: Blob): Promise<{ src: CanvasImageSource; width: number; height: number; done: () => void }> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { src: bmp, width: bmp.width, height: bmp.height, done: () => bmp.close() };
  } catch { /* try the <img> path */ }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { src: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

async function reencode(file: Blob, max: number, quality: number) {
  const img = await decode(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(img.src, 0, 0, w, h);
  img.done();
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', quality));
  return { blob, w, h };
}

/** Ask the browser not to evict our data under storage pressure (best effort). */
async function requestPersistence() {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch { /* not supported: fine */ }
}

export class PhotoReadError extends Error {}

export async function addPhoto(date: string, file: Blob): Promise<void> {
  let full, thumb;
  try {
    full = await reencode(file, FULL_MAX, 0.85);
    thumb = await reencode(file, THUMB_MAX, 0.8);
  } catch {
    throw new PhotoReadError('unreadable');
  }
  await db.photos.add({ id: newId(), date, blob: full.blob, thumb: thumb.blob, w: full.w, h: full.h, createdAt: Date.now() });
  void requestPersistence();
}

export const deletePhoto = (id: number) => db.photos.delete(id);
export const deleteAllPhotos = () => db.photos.clear();

export function usePhotosFor(date: string): Photo[] {
  return useLiveQuery(() => db.photos.where('date').equals(date).sortBy('createdAt'), [date]) ?? [];
}

export function useAllPhotos(): Photo[] {
  return useLiveQuery(async () => {
    const all = await db.photos.toArray();
    return all.sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));
  }) ?? [];
}

/** Object URL for a Blob, revoked when it changes or the component unmounts. */
export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) { setUrl(undefined); return; }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
