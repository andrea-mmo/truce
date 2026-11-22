import { useState } from 'react';
import {
  emptyProfile, toYmd, WEEK_ORDER,
  type BreakoutArea, type Challenge, type Concern, type Dow, type Makeup, type Profile, type Salon, type SkinType, type Supplement,
} from '../engine';
import { useT } from '../i18n';
import { saveChallenge, saveProfile } from '../db/hooks';

interface Props {
  initial: Profile | null;
  hasChallenge: boolean;
  today: Date;
  onClose: () => void;
}

const STEP_COUNT = 5;

type TriageKey = keyof Profile['triage'];
/** Triage questions in the order they are asked (REGLAS → A). Words in src/i18n (profile.triageQ). */
const TRIAGE_QUESTIONS: { id: TriageKey; optional?: boolean }[] = [{ id: 'T1' }, { id: 'T2' }, { id: 'T5' }, { id: 'T4', optional: true }];

function Choice<T extends string>({ value, options, text, onChange, multi }: {
  value: T | T[] | null; options: T[]; text: Record<T, string>; onChange: (v: T) => void; multi?: boolean;
}) {
  const on = (o: T) => (multi ? (value as T[]).includes(o) : value === o);
  return (
    <div className="qchoices" role={multi ? 'group' : 'radiogroup'}>
      {options.map((o) => (
        <button key={o} type="button" role={multi ? undefined : 'radio'} aria-checked={multi ? undefined : on(o)} aria-pressed={multi ? on(o) : undefined}
          className={`dtag${on(o) ? ' on' : ''}`} onClick={() => onChange(o)}>{text[o]}</button>
      ))}
    </div>
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function QuizSheet({ initial, hasChallenge, today, onClose }: Props) {
  const t = useT();
  const q9 = t.quiz;
  const pr = t.profile;
  // Older profiles may lack newer fields: fill them with defaults.
  const [p, setP] = useState<Profile>(() => {
    const base = emptyProfile();
    const init = initial ? structuredClone(initial) : base;
    return { ...base, ...init, breakoutAreas: init.breakoutAreas ?? [], hormonalSigns: init.hormonalSigns ?? null, triage: { ...base.triage, ...init.triage } };
  });
  const [step, setStep] = useState(0);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  const setTriage = (id: keyof Profile['triage'], v: Profile['triage'][keyof Profile['triage']]) =>
    setP((x) => ({ ...x, triage: { ...x.triage, [id]: v } }));

  const triageDone = TRIAGE_QUESTIONS.every((q) => p.triage[q.id] !== null) && p.hormonalSigns != null;
  const canNext = step === 0 ? p.name.trim().length > 0 : step === 3 ? triageDone : true;
  const last = step === STEP_COUNT - 1;
  const minDate = toYmd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));

  async function finish() {
    setSaving(true);
    await saveProfile({ ...p, name: p.name.trim(), supplementsOther: p.supplementsOther.trim(), reviewedAt: Date.now() });
    if (!hasChallenge && eventName.trim() && eventDate && eventDate >= minDate) {
      const c: Challenge = { name: eventName.trim(), date: eventDate, createdAt: toYmd(today) };
      await saveChallenge(c);
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="modal open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet quiz" role="dialog" aria-modal="true" aria-label={q9.label}>
        <div className="qhead">
          <div className="kicker">{q9.progress(step + 1, STEP_COUNT)}</div>
          <div className="qbar"><i style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }} /></div>
          <h3>{q9.steps[step]}</h3>
        </div>

        {step === 0 && (
          <div className="qbody">
            <label className="qlabel">{q9.name}
              <input className="sync-input" value={p.name} maxLength={30} onChange={(e) => set({ name: e.target.value })} placeholder={q9.namePlaceholder} autoFocus />
            </label>
            <p className="hint">{q9.nameHint}</p>
          </div>
        )}

        {step === 1 && (
          <div className="qbody">
            <div className="qlabel">{q9.skinType}</div>
            <Choice value={p.skinType} options={Object.keys(pr.skin) as SkinType[]} text={pr.skin} onChange={(v) => set({ skinType: v })} />
            <div className="qlabel">{q9.concerns} <small>{q9.several}</small></div>
            <Choice multi value={p.concerns} options={Object.keys(pr.concern) as Concern[]} text={pr.concern} onChange={(v) => set({ concerns: toggle(p.concerns, v) })} />
          </div>
        )}

        {step === 2 && (
          <div className="qbody">
            <div className="qlabel">{q9.sport}</div>
            <div className="daypick">
              {WEEK_ORDER.map((d) => (
                <button key={d} type="button" className={p.sportDays.includes(d) ? 'on' : ''} aria-pressed={p.sportDays.includes(d)}
                  onClick={() => set({ sportDays: toggle<Dow>(p.sportDays, d) })}>{t.common.dayShort[d]}</button>
              ))}
            </div>
            <p className="hint">{q9.sportHint}</p>
            <div className="qlabel">{q9.makeup}</div>
            <Choice value={p.makeup} options={Object.keys(pr.makeup) as Makeup[]} text={pr.makeup} onChange={(v) => set({ makeup: v })} />
            <div className="qlabel">{q9.salon}</div>
            <Choice value={p.salon} options={Object.keys(pr.salon) as Salon[]} text={pr.salon} onChange={(v) => set({ salon: v })} />
            <p className="hint">{q9.salonHint}</p>
            <div className="qlabel">{q9.supplements} <small>{q9.optional}</small></div>
            <Choice multi value={p.supplements} options={Object.keys(pr.supplement) as Supplement[]} text={pr.supplement} onChange={(v) => set({ supplements: toggle(p.supplements, v) })} />
            {p.supplements.includes('other') && (
              <input className="sync-input" value={p.supplementsOther} maxLength={80} placeholder={q9.supplementOther} onChange={(e) => set({ supplementsOther: e.target.value })} />
            )}
            <p className="hint">{q9.supplementsHint}</p>
          </div>
        )}

        {step === 3 && (
          <div className="qbody">
            <p className="hint" style={{ marginTop: 0 }}>{q9.healthIntro}</p>
            <div className="qtriage">
              <div className="qlabel">{q9.areas} <small>{q9.several}</small></div>
              <Choice multi value={p.breakoutAreas ?? []} options={Object.keys(pr.area) as BreakoutArea[]} text={pr.area}
                onChange={(v) => set({ breakoutAreas: toggle(p.breakoutAreas ?? [], v) })} />
              <div className="hint">{q9.areasHint}</div>
            </div>
            <div className="qtriage">
              <div className="qlabel">{pr.hormonal.q}</div>
              <div className="qchoices" role="radiogroup">
                {(['yes', 'no'] as const).map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={p.hormonalSigns === v}
                    className={`dtag${p.hormonalSigns === v ? ' on' : ''}`} onClick={() => set({ hormonalSigns: v })}>{v === 'yes' ? t.common.yes : t.common.no}</button>
                ))}
              </div>
              <div className="hint">{pr.hormonal.why}</div>
            </div>
            {TRIAGE_QUESTIONS.map((q) => (
              <div key={q.id} className="qtriage">
                <div className="qlabel">{pr.triageQ[q.id as keyof typeof pr.triageQ].q}{q.optional && <small> {q9.optional}</small>}</div>
                <div className="qchoices" role="radiogroup">
                  {(['yes', 'no', ...(q.optional ? ['skip'] : [])] as const).map((v) => (
                    <button key={v} type="button" role="radio" aria-checked={p.triage[q.id] === v}
                      className={`dtag${p.triage[q.id] === v ? ' on' : ''}`} onClick={() => setTriage(q.id, v as never)}>
                      {v === 'yes' ? t.common.yes : v === 'no' ? t.common.no : q9.preferNot}
                    </button>
                  ))}
                </div>
                <div className="hint">{pr.triageQ[q.id as keyof typeof pr.triageQ].why}</div>
              </div>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="qbody">
            {hasChallenge ? (
              <p className="hint" style={{ marginTop: 0 }}>{q9.hasChallenge}</p>
            ) : (
              <>
                <p className="hint" style={{ marginTop: 0 }}>{q9.eventIntro}</p>
                <label className="qlabel">{q9.eventWhat}
                  <input className="sync-input" value={eventName} maxLength={40} placeholder={q9.eventPlaceholder} onChange={(e) => setEventName(e.target.value)} />
                </label>
                <label className="qlabel">{q9.eventWhen}
                  <input className="sync-input" type="date" min={minDate} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </label>
              </>
            )}
          </div>
        )}

        <div className="row qnav">
          <button type="button" className="btn ghost" onClick={step === 0 ? onClose : () => setStep(step - 1)}>{step === 0 ? q9.notNow : q9.back}</button>
          {last
            ? <button type="button" className="btn" disabled={saving} onClick={finish}>{saving ? t.common.saving : q9.finish}</button>
            : <button type="button" className="btn" disabled={!canNext} onClick={() => setStep(step + 1)}>{q9.next}</button>}
        </div>
        {step === 3 && !triageDone && <div className="hint" style={{ textAlign: 'right' }}>{q9.answerAll}</div>}
      </div>
    </div>
  );
}
