import { useState } from 'react';
import { APP_VERSION, applyUpdate, checkForUpdate, useUpdateState } from '../pwa';
import { useT } from '../i18n';

export function VersionSection() {
  const t = useT();
  const { needRefresh, checking } = useUpdateState();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="field">
      <div className="lb">{t.update.version}</div>
      <div className="hint" style={{ marginTop: 0 }}>{APP_VERSION}</div>
      <div className="data-btns">
        {needRefresh ? (
          <button className="btn" onClick={applyUpdate}>{t.update.applyNew}</button>
        ) : (
          <button className="btn ghost" disabled={checking} onClick={async () => {
            setMsg(null);
            const found = await checkForUpdate();
            setMsg(found ? null : navigator.onLine ? t.update.upToDate : t.update.offline);
          }}>{checking ? t.update.checking : t.update.check}</button>
        )}
      </div>
      {msg && <div className="data-ok" role="status">{msg}</div>}
    </div>
  );
}
