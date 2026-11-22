import { useEffect, useMemo, useRef, useState } from 'react';
import ingredientsDb from '../data/ingredients.json';
import { buildIndex, parseInci, type IngredientDb } from '../engine';
import { cleanCode, lookupProduct, looksLikeInci, LookupFailed, validBarcode, type LookupResult } from '../barcode/barcode';
import { getT, useT } from '../i18n';

const index = buildIndex(ingredientsDb as IngredientDb);

interface Props {
  onUse: (r: { barcode: string; inci: string; name: string; brand: string }) => void;
}

/** Live camera scan; stops the camera as soon as a code is read or on close. */
function Scanner({ onCode, onError }: { onCode: (c: string) => void; onError: (m: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stopped = false;
    (async () => {
      try {
        const { createDetector } = await import('../barcode/scanner');
        const detector = createDetector();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = async () => {
          if (stopped || !video.current) return;
          try {
            const found = await detector.detect(video.current);
            const code = found.map((f) => cleanCode(f.rawValue)).find(validBarcode);
            if (code) { onCode(code); return; }
          } catch { /* frame not ready */ }
          timer = window.setTimeout(tick, 250);
        };
        void tick();
      } catch {
        onError(getT().barcode.camera);
      }
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode, onError]);
  return (
    <div className="scan-view">
      <video ref={video} playsInline muted />
      <div className="scan-frame" aria-hidden="true" />
    </div>
  );
}

export function BarcodeLookup({ onUse }: Props) {
  const t = useT();
  const b = t.barcode;
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  const reset = () => { setOpen(false); setScanning(false); setTyped(''); setResult(null); setError(null); };

  async function search(code: string) {
    setScanning(false); setBusy(true); setError(null); setResult(null);
    try { setResult(await lookupProduct(code)); }
    catch (e) { setError(b.error[e instanceof LookupFailed ? e.code : 'failed']); }
    finally { setBusy(false); }
  }

  const onCode = useMemo(() => (c: string) => { setTyped(c); void search(c); }, []);
  const onCamError = useMemo(() => (m: string) => { setScanning(false); setError(m); }, []);

  if (!open) {
    return <button type="button" className="btn ghost label-btn" onClick={() => setOpen(true)}>{b.open}</button>;
  }

  const found = result?.found ? result : null;
  const inciOk = found ? looksLikeInci(found.ingredients, index) : false;
  const parsedCount = found?.ingredients ? parseInci(found.ingredients, index).length : 0;

  return (
    <div className="label-box">
      <b>{b.title}</b>
      <p>{b.lead}</p>
      {scanning ? (
        <>
          <Scanner onCode={onCode} onError={onCamError} />
          <div className="data-btns"><button type="button" className="btn ghost" onClick={() => setScanning(false)}>{b.stopCamera}</button></div>
        </>
      ) : (
        <div className="data-btns">
          <button type="button" className="btn" disabled={busy} onClick={() => { setResult(null); setError(null); setScanning(true); }}>{b.scan}</button>
        </div>
      )}
      {/* Not a <form>: this lives inside the product form (forms can't nest). */}
      <div className="code-row">
        <input
          className="sync-input" inputMode="numeric" placeholder={b.typePlaceholder} value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void search(cleanCode(typed)); } }}
        />
        <button type="button" className="btn ghost" disabled={busy || cleanCode(typed).length < 8} onClick={() => void search(cleanCode(typed))}>{busy ? b.searching : b.search}</button>
      </div>
      {error && <div className="warn" role="alert">{error}</div>}

      {result && !result.found && (
        <p className="hint">{b.notFound.before}<a href={`https://world.openbeautyfacts.org/cgi/product.pl?type=add&code=${result.code}`} target="_blank" rel="noreferrer">{b.notFound.link}</a>{b.notFound.after}</p>
      )}

      {found && (
        <div className="obf-result">
          <b>{[found.brand, found.name].filter(Boolean).join(' · ') || b.found}</b>
          {found.ingredients ? (
            <>
              <p className="hint">{b.count(parsedCount)}</p>
              {!inciOk && <div className="warn">{b.notInci}</div>}
              <p className="obf-inci">{found.ingredients}</p>
              <p className="hint">{b.compare}</p>
            </>
          ) : <p className="hint">{b.noInci}</p>}
          <p className="obf-attr">{b.attribution.before}<a href={found.url} target="_blank" rel="noreferrer">Open Beauty Facts</a>{b.attribution.after}</p>
          <div className="data-btns">
            <button type="button" className="btn ghost" onClick={reset}>{t.common.close}</button>
            {found.ingredients && (
              <button type="button" className="btn" onClick={() => { onUse({ barcode: found.code, inci: found.ingredients, name: found.name, brand: found.brand }); reset(); }}>{b.use}</button>
            )}
          </div>
        </div>
      )}
      {!found && <div className="data-btns"><button type="button" className="btn ghost" onClick={reset}>{t.common.close}</button></div>}
    </div>
  );
}
