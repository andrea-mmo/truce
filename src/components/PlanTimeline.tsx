import type { Phase, PlanState } from '../engine';
import { timeline } from '../engine';
import { useT } from '../i18n';
import { phaseText, type PhaseProduct } from '../i18n/phase';

interface Props {
  phases: Phase[];
  week: number;
  plan: PlanState;
  productOf: (key: string) => PhaseProduct | undefined;
}

export function PlanTimeline({ phases, week, plan, productOf }: Props) {
  const t = useT();
  const text = (p: Phase) => phaseText(t, p.id, productOf(p.id));
  const weeksLabel = (p: Phase) => (p.id === 'keep' ? text(p).name : t.plan.weeks(p.from, p.to, text(p).name));
  return (
    <div className="section">
      <h3>{t.plan.title}</h3>
      <p className="lead">{t.plan.lead}</p>
      <div className="timeline">
        {timeline(phases, week).map(({ phase, status }) => {
          const r = phase.id !== 'reset' && phase.id !== 'keep' ? plan.reintro[phase.id] : undefined;
          return (
            <div key={phase.id} className={`tl ${status === 'future' ? '' : status}`}>
              <b>{weeksLabel(phase)}</b>
              {r && <span className={`res ${r}`}>{r === 'ok' ? t.plan.stays : t.plan.out}</span>}
              <p>{text(phase).desc}</p>
            </div>
          );
        })}
        {plan.resetVerdict === 'same' && (
          <p style={{ fontSize: 12.5, color: 'var(--clay-d)', marginTop: 6 }}>
            {t.plan.paused}
          </p>
        )}
      </div>
    </div>
  );
}


