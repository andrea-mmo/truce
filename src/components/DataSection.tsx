import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { db } from '../db/db';
import { setKv } from '../db/hooks';
import { deleteAllPhotos } from '../db/photos';
import {
  BackupError, createBackup, downloadBackup, parseBackup, restoreBackup, summarize,
  type BackupFile,
} from '../db/backup';
import { applyTheme, loadTheme, type Theme } from '../theme';
import { fmtDate as fmt, useT } from '../i18n';

const fmtDate = (iso: string) =>
  fmt(new Date(iso), { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function DataSection() {
  const t = useT();
  const d = t.data;
  const lastBackup = useLiveQuery(async () => (await db.kv.get('lastBackupAt'))?.value as string | undefined);
  const photoCount = useLiveQuery(() => db.photos.count()) ?? 0;
  const [withPhotos, setWithPhotos] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function exportNow() {
    setBusy(true);
    setMsg(null);
    try {
      const f = await createBackup({ includePhotos: withPhotos, theme: loadTheme() });
      downloadBackup(f);
      await setKv('lastBackupAt', f.exportedAt);
      setMsg({ ok: true, text: d.downloaded });
    } catch {
      setMsg({ ok: false, text: d.createFailed });
    } finally {
      setBusy(false);
    }
  }

  async function pick(files: FileList | null) {
    setMsg(null);
    setPending(null);
    const file = files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof BackupError ? d.error[e.code] : d.readFailed });
    }
  }

  async function confirmRestore() {
    if (!pending) return;
    setBusy(true);
    try {
      await restoreBackup(pending);
      if (pending.theme) applyTheme(pending.theme as Theme);
      setMsg({ ok: true, text: d.restored });
      setPending(null);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof BackupError ? d.error[e.code] : d.restoreFailed });
    } finally {
      setBusy(false);
    }
  }

  const s = pending && summarize(pending);

  return (
    <div className="field datasec">
      <div className="lb">{d.title}</div>
      <div className="hint" style={{ marginTop: 0, marginBottom: 8 }}>
        {d.intro}
        {' '}<b>{lastBackup ? d.lastBackup(fmtDate(lastBackup)) : d.noBackup}</b>
      </div>

      <label className="pf-check">
        <input type="checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} />
        {d.withPhotos(photoCount, photoCount > 0 && withPhotos)}
      </label>
      <div className="data-btns">
        <button className="btn" disabled={busy} onClick={exportNow}>{d.download}</button>
        <button className="btn ghost" disabled={busy} onClick={() => fileRef.current?.click()}>{d.restore}</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => pick(e.target.files)} />
      </div>

      {s && (
        <div className="restore-box" role="alertdialog" aria-label={d.confirmLabel}>
          <b>{d.confirmTitle}</b>
          <p>{d.summary({ date: fmtDate(s.exportedAt), products: s.products, days: s.days, notes: s.notes, weeks: s.weeks, photos: s.includesPhotos ? s.photos : null })}</p>
          <p><b>{d.replaces}</b>{d.replacesHint}</p>
          <div className="data-btns">
            <button className="btn ghost" onClick={() => setPending(null)} disabled={busy}>{t.common.cancel}</button>
            <button className="btn danger-solid" onClick={confirmRestore} disabled={busy}>{d.confirm}</button>
          </div>
        </div>
      )}

      {msg && <div className={msg.ok ? 'data-ok' : 'warn'} role="status">{msg.text}</div>}

      <button
        className="btn ghost danger" style={{ marginTop: 12 }}
        onClick={() => { if (window.confirm(d.confirmDeletePhotos)) void deleteAllPhotos(); }}
      >{d.deletePhotos}</button>
      <div className="hint">{d.healthHint}</div>
    </div>
  );
}
