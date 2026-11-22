/**
 * Backup file: everything in the local database as one JSON file.
 * The file contains health data (notes, scores, skin photos): it's saved
 * where the person chooses and never sent anywhere by the app.
 */
import { db, type PielDB } from './db';
import { getT } from '../i18n';

/** Internal marker: kept as 'piel' (the app's old name) so earlier backups still restore. */
export const BACKUP_APP = 'piel';
export const BACKUP_FORMAT = 1;
/** Oldest schema whose data can be restored as-is (v7 only added the device table). */
export const MIN_RESTORABLE_SCHEMA = 6;

const TABLES = ['kv', 'products', 'dailyChecks', 'dailyNotes', 'weeklyLogs', 'photos'] as const;
type TableName = (typeof TABLES)[number];

interface SerializedPhoto {
  id?: number;
  date: string;
  blob: string; // data: URL
  thumb: string;
  w: number;
  h: number;
  createdAt: number;
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  format: number;
  /** Dexie schema version the data was written with. */
  schema: number;
  exportedAt: string;
  includesPhotos: boolean;
  theme?: string;
  tables: Record<Exclude<TableName, 'photos'>, unknown[]> & { photos: SerializedPhoto[] };
}

export interface BackupSummary {
  exportedAt: string;
  products: number;
  days: number;
  notes: number;
  weeks: number;
  photos: number;
  includesPhotos: boolean;
}

export async function blobToDataUrl(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return `data:${b.type || 'application/octet-stream'};base64,${btoa(bin)}`;
}

export function dataUrlToBlob(url: string): Blob {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url);
  if (!m) throw new BackupError('photo');
  const mime = m[1] || 'application/octet-stream';
  if (!m[2]) return new Blob([decodeURIComponent(m[3])], { type: mime });
  const bin = atob(m[3]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function createBackup(opts: { includePhotos: boolean; theme?: string }, database: PielDB = db): Promise<BackupFile> {
  const [kv, products, dailyChecks, dailyNotes, weeklyLogs, photos] = await Promise.all([
    database.kv.toArray(), database.products.toArray(), database.dailyChecks.toArray(),
    database.dailyNotes.toArray(), database.weeklyLogs.toArray(),
    opts.includePhotos ? database.photos.toArray() : Promise.resolve([]),
  ]);
  const serializedPhotos: SerializedPhoto[] = [];
  for (const p of photos) {
    serializedPhotos.push({ ...p, blob: await blobToDataUrl(p.blob), thumb: await blobToDataUrl(p.thumb) });
  }
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    schema: database.verno,
    exportedAt: new Date().toISOString(),
    includesPhotos: opts.includePhotos,
    theme: opts.theme,
    tables: { kv, products, dailyChecks, dailyNotes, weeklyLogs, photos: serializedPhotos },
  };
}

export type BackupErrorCode = 'not-json' | 'not-piel' | 'newer' | 'older' | 'broken' | 'photo';

export class BackupError extends Error {
  constructor(public code: BackupErrorCode) { super(code); }
}

/** Checks a parsed file before anything is touched. */
export function validateBackup(data: unknown, database: PielDB = db): BackupFile {
  const f = data as Partial<BackupFile> | null;
  if (!f || typeof f !== 'object' || f.app !== BACKUP_APP || typeof f.format !== 'number') throw new BackupError('not-piel');
  if (f.format > BACKUP_FORMAT || (f.schema ?? 0) > database.verno) throw new BackupError('newer');
  if ((f.schema ?? 0) < MIN_RESTORABLE_SCHEMA) throw new BackupError('older');
  const t = f.tables as BackupFile['tables'] | undefined;
  if (!t || !TABLES.every((name) => Array.isArray(t[name]))) throw new BackupError('broken');
  if (!t.kv.some((r) => (r as { key?: string }).key === 'settings')) throw new BackupError('broken');
  return f as BackupFile;
}

export function parseBackup(text: string, database: PielDB = db): BackupFile {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new BackupError('not-json'); }
  return validateBackup(data, database);
}

export function summarize(f: BackupFile): BackupSummary {
  return {
    exportedAt: f.exportedAt,
    products: f.tables.products.length,
    days: f.tables.dailyChecks.length,
    notes: f.tables.dailyNotes.length,
    weeks: f.tables.weeklyLogs.length,
    photos: f.tables.photos.length,
    includesPhotos: f.includesPhotos,
  };
}

/**
 * Replaces everything on this device with the backup, in one transaction:
 * if anything fails, nothing changes. A backup without photos keeps the
 * photos already on the device.
 */
export async function restoreBackup(f: BackupFile, database: PielDB = db): Promise<void> {
  const photos = f.includesPhotos
    ? f.tables.photos.map((p) => ({ ...p, blob: dataUrlToBlob(p.blob), thumb: dataUrlToBlob(p.thumb) }))
    : null;
  await database.transaction('rw', [database.kv, database.products, database.dailyChecks, database.dailyNotes, database.weeklyLogs, database.photos], async () => {
    // "Última copia" describes this device, not the file: keep it.
    const lastBackup = await database.kv.get('lastBackupAt');
    await Promise.all([database.kv.clear(), database.products.clear(), database.dailyChecks.clear(), database.dailyNotes.clear(), database.weeklyLogs.clear()]);
    await database.kv.bulkPut((f.tables.kv as { key: string }[]).filter((r) => r.key !== 'lastBackupAt') as never[]);
    if (lastBackup) await database.kv.put(lastBackup);
    await database.products.bulkPut(f.tables.products as never[]);
    await database.dailyChecks.bulkPut(f.tables.dailyChecks as never[]);
    await database.dailyNotes.bulkPut(f.tables.dailyNotes as never[]);
    await database.weeklyLogs.bulkPut(f.tables.weeklyLogs as never[]);
    if (photos) {
      await database.photos.clear();
      await database.photos.bulkPut(photos);
    }
  });
}

/** Saves the file through the browser's download (on iPhone: share sheet). */
export function downloadBackup(f: BackupFile) {
  const blob = new Blob([JSON.stringify(f)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getT().data.fileName(f.exportedAt.slice(0, 10), f.includesPhotos);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
