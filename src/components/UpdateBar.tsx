import { applyUpdate, useUpdateState } from '../pwa';
import { useT } from '../i18n';

/** Shown at the top when a new version is ready. */
export function UpdateBar() {
  const t = useT();
  const { needRefresh } = useUpdateState();
  if (!needRefresh) return null;
  return (
    <div className="updatebar" role="status">
      <span>{t.update.available}</span>
      <button className="pill ok" onClick={applyUpdate}>{t.update.apply}</button>
    </div>
  );
}
