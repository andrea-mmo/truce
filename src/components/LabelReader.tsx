import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import ingredientsDb from '../data/ingredients.json';
import { buildIndex, type IngredientDb } from '../engine';
import { db } from '../db/db';
import { setKv } from '../db/hooks';
import { isKnown, LabelReadError, labelReadingAvailable, readLabel, rowsToInci, toRows, type LabelResult, type ReviewRow } from '../label/label';
import { getLang, useT } from '../i18n';
import { Glyph } from './Glyph';
import { IS_DEMO } from '../demo';

const index = buildIndex(ingredientsDb as IngredientDb);
const MAX_PHOTOS = 3;


interface Props {
  onConfirm: (r: { inci: string; productName: string; brand: string }) => void;
}

export function LabelReader({ onConfirm }: Props) {
  const t = useT();
  const l = t.label;
  const consent = useLiveQuery(async () => !!(await db.kv.get('labelConsent')));
  // Reading with Claude is offered only when an API key is configured (it costs money).
  // Reading on the device (Tesseract) is always available and free.
  const [cloud, setCloud] = useState(false);
  // Demo: only on-device reading (the AI option needs the private backend).
  useEffect(() => { if (!IS_DEMO) void labelReadingAvailable().then(setCloud); }, []);
  const [mode, setMode] = useState<'device' | 'cloud'>('device');
  const [progress, setProgress] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabelResult | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const nextKey = useRef(1000);

  const reset = () => { setOpen(false); setFiles([]); setResult(null); setRows([]); setError(null); setProgress(null); };
  const addFiles = (list: FileList | null) => {
    if (!list) return;
    // Copy now: clearing the input below empties this live FileList.
    const picked = Array.from(list);
    setFiles((f) => [...f, ...picked].slice(0, MAX_PHOTOS));
    if (camRef.current) camRef.current.value = '';
    if (galRef.current) galRef.current.value = '';
  };

  async function read() {
    setBusy(true); setError(null);
    try {
      const r = mode === 'cloud'
        ? await readLabel(files, getLang())
        : await (await import('../label/ocr')).readLabelOnDevice(files, (p) =>
          setProgress(p.stage === 'loading' ? l.preparing : l.reading(p.pct)));
      setFiles([]); // the photos are no longer needed
      if (r.unreadable || r.inci.length === 0) { setError(l.notFound); return; }
      setResult(r); setRows(toRows(r));
    } catch (e) {
      setError(mode === 'device'
        ? l.deviceFailed
        : l.error[e instanceof LabelReadError ? e.code : 'failed']);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const unknown = useMemo(() => rows.filter((r) => r.name.trim() && !isKnown(r.name, index)).length, [rows]);
  const doubtful = rows.filter((r) => r.confidence !== 'high').length;
  const setRow = (key: number, name: string) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, name, confidence: 'high' } : r)));

  if (!open) {
    return (
      <button type="button" className="btn ghost label-btn" onClick={() => setOpen(true)}>
        <Glyph emoji="📷" icon="camera" size={16} /> {l.open}
      </button>
    );
  }

  return (
    <div className="label-box">
      {mode === 'cloud' && !consent ? (
        <>
          <b>{l.consentTitle}</b>
          <p>{l.consent.before}<b>{l.consent.bold}</b>{l.consent.after}</p>
          <div className="data-btns">
            <button type="button" className="btn ghost" onClick={reset}>{t.common.cancel}</button>
            <button type="button" className="btn" onClick={() => void setKv('labelConsent', { at: Date.now() })}>{l.agree}</button>
          </div>
        </>
      ) : !result ? (
        <>
          <b>{l.photoTitle}</b>
          {cloud && (
            <div className="cmp-mode" role="group" aria-label={l.howLabel}>
              <button type="button" className={mode === 'device' ? 'on' : ''} aria-pressed={mode === 'device'} onClick={() => setMode('device')}>{l.modeDevice}</button>
              <button type="button" className={mode === 'cloud' ? 'on' : ''} aria-pressed={mode === 'cloud'} onClick={() => setMode('cloud')}>{l.modeCloud}</button>
            </div>
          )}
          <p>
            {mode === 'device'
              ? l.deviceHint
              : l.cloudHint}
            {' '}{l.photosHint(MAX_PHOTOS)}
          </p>
          <div className="data-btns">
            <button type="button" className="btn ghost" disabled={busy || files.length >= MAX_PHOTOS} onClick={() => camRef.current?.click()}>{t.common.takePhoto}</button>
            <button type="button" className="btn ghost" disabled={busy || files.length >= MAX_PHOTOS} onClick={() => galRef.current?.click()}>{t.common.fromGallery}</button>
          </div>
          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addFiles(e.target.files)} />
          <input ref={galRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          {files.length > 0 && <p className="hint">{l.photosReady(files.length)}</p>}
          {progress && <p className="hint" role="status">{progress}</p>}
          {error && <div className="warn" role="alert">{error}</div>}
          <div className="data-btns">
            <button type="button" className="btn ghost" disabled={busy} onClick={reset}>{t.common.cancel}</button>
            <button type="button" className="btn" disabled={busy || files.length === 0} onClick={read}>{busy ? l.readingShort : l.read}</button>
          </div>
        </>
      ) : (
        <>
          <b>{l.reviewTitle(rows.filter((r) => r.name.trim()).length)}</b>
          <p>{l.reviewCompare}{doubtful > 0 && <>{l.reviewDoubtful(doubtful).before}<b>{l.reviewDoubtful(doubtful).bold}</b>{l.reviewDoubtful(doubtful).after}</>}{l.reviewEdit}</p>
          {result.warnings.length > 0 && <ul className="label-warn">{result.warnings.map((w, i) => <li key={i}>{l.warning[w as keyof typeof l.warning] ?? w}</li>)}</ul>}
          <ol className="label-rows">
            {rows.map((r) => (
              <li key={r.key} className={`lr ${r.confidence}`}>
                <input aria-label={l.ingredient} value={r.name} onChange={(e) => setRow(r.key, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); /* don't submit the product form */ }} />
                <span className="lr-meta">
                  {l.confidence[r.confidence] && <span className={`tg ${r.confidence === 'low' ? 'adv skip' : 'adv caution'}`}>{l.confidence[r.confidence]}</span>}
                  {r.name.trim() && !isKnown(r.name, index) && <span className="tg opt">{l.unknown}</span>}
                  {r.raw && r.raw !== r.name && <span className="lr-raw">{r.raw}</span>}
                </span>
                <button type="button" className="lr-del" aria-label={l.removeIngredient} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>×</button>
              </li>
            ))}
          </ol>
          <button type="button" className="btn ghost" onClick={() => setRows((rs) => [...rs, { key: nextKey.current++, name: '', confidence: 'high', raw: '' }])}>{l.addIngredient}</button>
          {unknown > 0 && <p className="hint">{l.unknownHint(unknown)}</p>}
          <div className="data-btns">
            <button type="button" className="btn ghost" onClick={reset}>{l.discard}</button>
            <button
              type="button" className="btn" disabled={!rowsToInci(rows)}
              onClick={() => { onConfirm({ inci: rowsToInci(rows), productName: result.product_name, brand: result.brand }); reset(); }}
            >{l.use}</button>
          </div>
        </>
      )}
    </div>
  );
}
