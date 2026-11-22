import { Glyph } from './Glyph';
import { isResolved, isSkipped, POINTS, type Step, type StepAdvice } from '../engine';
import { useT, type Messages } from '../i18n';

export interface StepProduct {
  name: string;
  brand: string;
  howTo: string;
  category: string;
}

interface Props {
  kind: 'am' | 'pm';
  title: string;
  subtitle: string;
  steps: Step[];
  checks: Record<string, boolean>;
  productById: (id: number) => StepProduct | undefined;
  /** Today's rules on each step (R10, F1, F2). */
  advice?: Record<string, StepAdvice>;
  onToggle: (id: string) => void;
  onSkip: (id: string) => void;
}

function stepText(t: Messages, s: Step, p: StepProduct | undefined): { name: string; what: string } {
  const r = t.routine;
  const full = p ? `${p.brand} ${p.name}`.trim() : '';
  switch (s.role) {
    case 'led':
      return r.led;
    case 'treatment':
      return p
        ? { name: full, what: p.howTo }
        : r.treatmentNone(t.treatment[s.treatment!].short);
    case 'firstCleanse':
      return p?.category === 'oil-cleanser'
        ? { name: full, what: p.howTo || r.oilCleanseHow }
        : { name: r.firstCleanse(full), what: r.firstCleanseWhat };
    case 'secondCleanse':
      return { name: full, what: r.secondCleanseWhat };
    default:
      return { name: full || t.common.product, what: p?.howTo ?? '' };
  }
}

export function RoutineCard({ kind, title, subtitle, steps, checks, productById, advice = {}, onToggle, onSkip }: Props) {
  const t = useT();
  const done = steps.filter((s) => isResolved(checks, s.id)).length;
  const complete = steps.length > 0 && done === steps.length;
  return (
    <div className={`rcard${complete ? ' complete' : ''}`}>
      <div className="rhead">
        <div className={`badge ${kind === 'am' ? 'sun' : 'moon'}`}>{kind === 'am' ? <Glyph emoji="☀" icon="sun" size={20} /> : <Glyph emoji="☾" icon="moon" size={20} />}</div>
        <div><h2>{title}</h2><div className="sub">{subtitle}</div></div>
        <div className="prog">
          <span>{done}/{steps.length}</span>
          <div className="bar"><i style={{ width: `${steps.length ? (done / steps.length) * 100 : 0}%` }} /></div>
        </div>
      </div>
      <div>
        {steps.map((s, i) => {
          const text = stepText(t, s, s.productId !== undefined ? productById(s.productId) : undefined);
          const skipped = isSkipped(checks, s.id);
          const adv = advice[s.id];
          const isDone = !!checks[s.id];
          return (
            <div
              key={s.id}
              className={`step${isDone ? ' done' : ''}${skipped ? ' skipped' : ''}${s.treatment ? ` treat t-${s.treatment}` : ''}${adv && !skipped ? ` adv-${adv.kind}` : ''}`}
              role="checkbox"
              aria-checked={isDone}
              tabIndex={0}
              onClick={() => onToggle(s.id)}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(s.id); } }}
            >
              <div className="box">{skipped ? '–' : '✓'}</div>
              <div className="num">{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pname">{text.name}</div>
                {text.what && <div className="pwhat">{text.what}</div>}
                <div>
                  {skipped
                    ? <span className="tg opt">{t.routine.skipped}</span>
                    : s.tag && <span className={`tg ${s.tag.style}`}>{t.tag(s.tag.label, s.treatment)}</span>}
                  {adv && !skipped && !isDone && (
                    <span className={`tg adv ${adv.kind}`} title={t.routine.rule(adv.ruleId)}>
                      {adv.kind === 'skip' ? t.routine.advSkip : t.routine.advCaution}
                    </span>
                  )}
                </div>
              </div>
              {(s.treatment || adv) && !isDone && (
                <button
                  className={`skipbtn${adv?.kind === 'skip' && !skipped ? ' recommended' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onSkip(s.id); }}
                  aria-label={skipped ? t.routine.undoSkipLabel : t.routine.skipLabel}
                >{skipped ? t.routine.undo : t.routine.skip}</button>
              )}
            </div>
          );
        })}
      </div>
      <div className="alldone">{t.routine.allDone(kind === 'am')} <span className="plus">+{POINTS.routineComplete}</span></div>
    </div>
  );
}
