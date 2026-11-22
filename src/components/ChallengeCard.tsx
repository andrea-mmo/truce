import { useState } from 'react';
import { challengeStatus, parseYmd, toYmd, type Challenge, type Phase, type PlanState } from '../engine';
import { fmtDate, useT } from '../i18n';
import { saveChallenge } from '../db/hooks';

interface Props {
  challenge: Challenge | null;
  today: Date;
  phases: Phase[];
  plan: PlanState;
  completeDates: string[];
  nameOf: (key: string) => string;
}

export function ChallengeCard({ challenge, today, phases, plan, completeDates, nameOf }: Props) {
  const t = useT();
  const c = t.challenge;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const todayKey = toYmd(today);

  function startEdit() {
    setName(challenge?.name ?? '');
    setDate(challenge?.date ?? '');
    setEditing(true);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !date || date <= todayKey) return;
    await saveChallenge({ name: name.trim(), date, createdAt: challenge?.createdAt ?? todayKey });
    setEditing(false);
  }

  if (!challenge || editing) {
    return (
      <div className="section challenge">
        <h3>{c.title}</h3>
        <p className="lead">{c.lead}</p>
        <form onSubmit={submit} className="ch-form">
          <label>
            <span>{c.what}</span>
            <input type="text" value={name} maxLength={40} placeholder={c.placeholder} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span>{c.when}</span>
            <input type="date" value={date} min={toYmd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="row">
            {editing && <button type="button" className="btn ghost" onClick={() => setEditing(false)}>{t.common.cancel}</button>}
            <button type="submit" className="btn" disabled={!name.trim() || !date || date <= todayKey}>{challenge ? t.common.save : c.create}</button>
          </div>
        </form>
      </div>
    );
  }

  const st = challengeStatus(challenge, today, phases, plan, completeDates);
  const when = fmtDate(parseYmd(challenge.date), { day: 'numeric', month: 'long', year: 'numeric' });
  const fmt = (ymd: string) => fmtDate(parseYmd(ymd), { day: 'numeric', month: 'long' });
  const pct = st.consistency === null ? null : Math.round(st.consistency * 100);

  return (
    <div className="section challenge">
      <h3>{c.title}</h3>
      <div className="ch-head">
        <div>
          <div className="ch-name">{challenge.name}</div>
          <div className="ch-date">{when}</div>
        </div>
        <div className="ch-count">
          {st.isPast ? <span>{c.past}</span> : st.isToday ? <span>{c.today}</span> : <><b>{st.daysLeft}</b><span>{t.common.days(st.daysLeft)}</span></>}
        </div>
      </div>
      <div className="ch-cons">
        <div className="ch-cons-top">
          <span>{c.consistency}</span>
          <b>{pct === null ? '–' : `${pct}%`}</b>
        </div>
        <div className="lvlbar"><i style={{ width: `${pct ?? 0}%` }} /></div>
        <div className="lvlnext">{c.complete(st.daysComplete, st.daysTracked)}</div>
      </div>
      {st.warnings.map((w, i) => {
        const wt = c.warning(w, nameOf, fmt);
        return (
          <div key={i} className="tip warn" style={{ marginTop: 10 }}>
            <div className="tip-ico" aria-hidden="true">!</div>
            <div title={t.common.source(wt.source)}><b>{wt.title}</b><p>{wt.body}</p></div>
          </div>
        );
      })}
      <p className="ch-note">{c.note}</p>
      <div className="row">
        <button className="btn ghost" onClick={() => saveChallenge(null)}>{c.delete}</button>
        <button className="btn ghost" onClick={startEdit}>{t.common.edit}</button>
      </div>
    </div>
  );
}
