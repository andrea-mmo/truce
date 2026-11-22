import type { Analyzed } from '../engine';
import { analyzeRoutine, proposeReset } from '../engine';
import { useT } from '../i18n';

export function AnalysisPanel({ items }: { items: Analyzed[] }) {
  const t = useT();
  const a = t.analysis.panel;
  const nameOf = (id: number) => {
    const p = items.find((a) => a.product.id === id)?.product;
    return p ? `${p.brand} ${p.name}`.trim() : '?';
  };
  const findings = analyzeRoutine(items);
  const reset = proposeReset(items);

  return (
    <div className="section analysis">
      <h3>{a.title}</h3>
      <p className="lead">{a.lead}</p>

      {findings.length === 0 ? (
        <p className="pf-hint">{a.nothing}</p>
      ) : (
        <ul className="tip-list">
          {findings.map((f, i) => {
            const ft = t.analysis.routine(f, nameOf);
            return (
              <li key={i} className={`tip ${f.severity === 'info' ? 'info' : 'warn'}`}>
                <div className="tip-ico" aria-hidden="true">{f.severity === 'info' ? 'i' : '!'}</div>
                <div title={t.common.source(ft.source)}>
                  <b>{ft.title}</b>
                  <p>{ft.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {findings.length > 0 && <p className="tip-src">{t.common.pendingRules}</p>}

      <h4 className="an-h">{a.resetTitle}</h4>
      <p className="pf-hint">{a.resetBody(reset.loadAfter)}</p>
      <ul className="an-list">
        {reset.pause.map((p) => (
          <li key={p.id}><b>{nameOf(p.id)}</b> <span>· {t.analysis.pauseReason[p.reason]}</span></li>
        ))}
      </ul>

      <h4 className="an-h">{a.reintroTitle}</h4>
      <p className="pf-hint">{a.reintroBody}</p>
      <ol className="an-list an-ol">
        {reset.reintro.map((r) => (
          <li key={r.id}>
            <b>{nameOf(r.id)}</b>
            {!r.riskKnown && (
              <span className="an-unk">
                {' · '}{a.unknownRisk(r.uncertainty > 0)}
              </span>
            )}
          </li>
        ))}
      </ol>
      {reset.notReintroduced.length > 0 && (
        <p className="pf-hint">{a.notReintroduced(reset.notReintroduced.map(nameOf).join(', '))}</p>
      )}
      <p className="tip-src">{a.footer}</p>
    </div>
  );
}
