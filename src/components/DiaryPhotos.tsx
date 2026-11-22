import { Glyph } from './Glyph';
import { useRef, useState } from 'react';
import type { Photo } from '../db/db';
import { addPhoto, deletePhoto, PhotoReadError, useObjectUrl, usePhotosFor } from '../db/photos';
import { useT } from '../i18n';

export function Thumb({ photo, onDelete }: { photo: Photo; onDelete: () => void }) {
  const t = useT();
  const url = useObjectUrl(photo.thumb);
  return (
    <div className="ph-thumb">
      {url && <img src={url} alt={t.photos.alt(photo.date)} />}
      <button className="ph-del" aria-label={t.photos.delete} onClick={onDelete}>×</button>
    </div>
  );
}

export function DiaryPhotos({ date }: { date: string }) {
  const t = useT();
  const photos = usePhotosFor(date);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const f of Array.from(files)) await addPhoto(date, f);
    } catch (e) {
      setError(e instanceof PhotoReadError
        ? t.photos.readError
        : t.photos.saveError);
    } finally {
      setBusy(false);
      if (camRef.current) camRef.current.value = '';
      if (galRef.current) galRef.current.value = '';
    }
  }

  function remove(id: number) {
    if (window.confirm(t.photos.confirmDelete)) void deletePhoto(id);
  }

  return (
    <div className="ph">
      <div className="ph-row">
        {photos.map((p) => <Thumb key={p.id} photo={p} onDelete={() => remove(p.id!)} />)}
        <button className="ph-add" disabled={busy} onClick={() => camRef.current?.click()}>
          <span className="ph-ico"><Glyph emoji="📷" icon="camera" size={22} /></span>{busy ? t.common.saving : t.common.takePhoto}
        </button>
        <button className="ph-add ghost" disabled={busy} onClick={() => galRef.current?.click()}>
          <span className="ph-ico"><Glyph emoji="🖼" icon="image" size={22} /></span>{t.common.fromGallery}
        </button>
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => onFiles(e.target.files)} />
      <input ref={galRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      {error && <div className="warn" role="alert">{error}</div>}
      <div className="ph-hint">{t.photos.hint}</div>
    </div>
  );
}
