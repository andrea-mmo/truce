import type { Tip } from '../engine';
import { useT } from '../i18n';

export function TipsCard({ tips, nameOf }: { tips: Tip[]; nameOf: (key: string) => string }) {
  const t = useT();
  if (!tips.length) return null;
  return (
    <div className="section tips">
      <h3>{t.tipsCard.title}</h3>
      <p className="lead">{t.tipsCard.lead}</p>
      <ul className="tip-list">
        {tips.map((tip, i) => {
          const text = t.tips[tip.id];
          return (
            <li key={`${tip.id}-${i}`} className={`tip ${tip.severity}`}>
              <div className="tip-ico" aria-hidden="true">{tip.severity === 'warn' ? '!' : 'i'}</div>
              <div>
                <b>{text.title}</b>
                <p>{text.body(tip, nameOf)}</p>
                <details>
                  <summary>{t.tipsCard.why}</summary>
                  <p>{text.why}</p>
                  <p className="tip-src">{t.common.source(text.source)}. {t.tipsCard.evidence}</p>
                </details>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
