import { IS_DEMO } from '../demo';
import { db } from '../db/db';
import { useT } from '../i18n';

/** Demo build only: says the data is invented and lets you start over. */
export function DemoBar() {
  const t = useT();
  if (!IS_DEMO) return null;
  async function restart() {
    if (!window.confirm(t.demo.confirmRestart)) return;
    db.close();
    await db.delete();
    location.reload();
  }
  return (
    <div className="updatebar demobar" role="note">
      <span>{t.demo.bar}</span>
      <button className="pill" onClick={restart}>{t.demo.restart}</button>
    </div>
  );
}
