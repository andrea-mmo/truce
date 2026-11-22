import { daysBetween, parseYmd } from './dates';

export interface PhotoRef {
  id: number;
  date: string;
  createdAt: number;
}

/** Oldest first; same day by time taken. */
export function sortPhotos<T extends PhotoRef>(photos: T[]): T[] {
  return [...photos].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));
}

/** Default pair to compare: the first photo ever vs the latest one. */
export function defaultComparison<T extends PhotoRef>(photos: T[]): { before: T; after: T } | null {
  if (photos.length < 2) return null;
  const s = sortPhotos(photos);
  return { before: s[0], after: s[s.length - 1] };
}

/** Days between two photos, always positive. */
export function daysApart(a: PhotoRef, b: PhotoRef): number {
  return Math.abs(daysBetween(parseYmd(a.date), parseYmd(b.date)));
}
