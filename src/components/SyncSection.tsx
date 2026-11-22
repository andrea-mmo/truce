import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db/db';
import { httpTransport, SyncHttpError } from '../sync/http';
import { disableSync, enableSync, wipeCloud, WrongPassphrase, type SyncState } from '../sync/sync';
import { device, runSync, useSyncStatus } from '../sync/useSync';
import { fmtDateTime, useT, type Messages } from '../i18n';

const MIN_LEN = 10;

function ago(t: Messages, ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return t.sync.justNow;
  if (s < 3600) return t.sync.minutesAgo(Math.round(s / 60));
  return fmtDateTime(new Date(ts), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function SyncSection() {
  const t = useT();
  const y = t.sync;
  const state = useLiveQuery(async () => ((await db.device.get('sync'))?.value as SyncState | undefined) ?? null);
  const status = useSyncStatus();
  const [phrase, setPhrase] = useState('');
  const [phrase2, setPhrase2] = useState('');
  const [step, setStep] = useState<'idle' | 'checking' | 'new' | 'join'>('idle');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fail = (e: unknown) => {
    if (e instanceof WrongPassphrase) return y.wrongPhrase;
    if (e instanceof SyncHttpError && (e.status === 401 || e.code === 'login')) return y.sessionExpired;
    if (e instanceof SyncHttpError && e.status === 404) return y.notAvailable;
    return y.failed;
  };

  async function start() {
    setMsg(null);
    setStep('checking');
    try {
      const meta = await httpTransport.meta();
      setStep(meta.setup ? 'join' : 'new');
    } catch (e) {
      setStep('idle');
      setMsg({ ok: false, text: fail(e) });
    }
  }

  async function confirm() {
    if (step === 'new' && (phrase.length < MIN_LEN || phrase !== phrase2)) return;
    if (step === 'join' && !window.confirm(y.confirmJoin)) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await enableSync(db, httpTransport, device, phrase);
      setPhrase(''); setPhrase2(''); setStep('idle');
      setMsg({ ok: true, text: r === 'created' ? y.created : y.joined });
      void runSync();
    } catch (e) {
      setMsg({ ok: false, text: fail(e) });
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (!window.confirm(y.confirmOff)) return;
    await disableSync(device);
    void runSync();
  }

  async function wipe() {
    if (!window.confirm(y.confirmWipe)) return;
    setBusy(true);
    try { await wipeCloud(httpTransport, device); setMsg({ ok: true, text: y.wiped }); }
    catch (e) { setMsg({ ok: false, text: fail(e) }); }
    finally { setBusy(false); }
  }

  const on = !!state?.enabled;
  const statusText = !on ? null
    : status.kind === 'syncing' ? y.syncing
    : status.kind === 'offline' ? y.offline
    : status.kind === 'error' ? y.statusError[status.reason]
    : state?.lastSyncAt ? y.synced(ago(t, state.lastSyncAt)) : y.pending;

  return (
    <div className="field syncsec">
      <div className="lb">{y.title}</div>
      {on ? (
        <>
          <div className={`sync-status ${status.kind}`} role="status">{statusText}</div>
          <div className="hint" style={{ marginTop: 4 }}>{y.onHint}</div>
          <div className="data-btns">
            <button className="btn" disabled={busy || status.kind === 'syncing'} onClick={() => void runSync()}>{y.now}</button>
            <button className="btn ghost" disabled={busy} onClick={turnOff}>{y.turnOff}</button>
          </div>
        </>
      ) : step === 'idle' || step === 'checking' ? (
        <>
          <div className="hint" style={{ marginTop: 0 }}>
            {y.offHint}
          </div>
          <div className="data-btns">
            <button className="btn" disabled={step === 'checking'} onClick={start}>{step === 'checking' ? y.checking : y.enable}</button>
          </div>
        </>
      ) : (
        <div className="restore-box">
          {step === 'new' ? (
            <>
              <b>{y.newTitle}</b>
              <p>{y.newHint(MIN_LEN).before}<b>{y.newHint(MIN_LEN).bold}</b>{y.newHint(MIN_LEN).after}</p>
              <input className="sync-input" type="password" autoComplete="new-password" placeholder={y.phrase} value={phrase} onChange={(e) => setPhrase(e.target.value)} />
              <input className="sync-input" type="password" autoComplete="new-password" placeholder={y.repeat} value={phrase2} onChange={(e) => setPhrase2(e.target.value)} />
              {phrase2 && phrase !== phrase2 && <div className="warn">{y.mismatch}</div>}
            </>
          ) : (
            <>
              <b>{y.joinTitle}</b>
              <p>{y.joinHint.before}<b>{y.joinHint.bold}</b>{y.joinHint.after}</p>
              <input className="sync-input" type="password" autoComplete="current-password" placeholder={y.phrase} value={phrase} onChange={(e) => setPhrase(e.target.value)} />
            </>
          )}
          <div className="data-btns">
            <button className="btn ghost" disabled={busy} onClick={() => { setStep('idle'); setPhrase(''); setPhrase2(''); }}>{t.common.cancel}</button>
            <button
              className="btn" disabled={busy || !phrase || (step === 'new' && (phrase.length < MIN_LEN || phrase !== phrase2))}
              onClick={confirm}
            >{busy ? y.wait : step === 'new' ? y.activate : y.join}</button>
          </div>
        </div>
      )}
      {msg && <div className={msg.ok ? 'data-ok' : 'warn'} role="status">{msg.text}</div>}
      {on && (
        <button className="btn ghost danger" style={{ marginTop: 10 }} disabled={busy} onClick={wipe}>{y.wipe}</button>
      )}
    </div>
  );
}
