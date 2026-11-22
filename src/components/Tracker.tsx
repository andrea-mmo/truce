import { useEffect, useState } from 'react';
import { saveWeeklyLog, useWeeklyLogs } from '../db/hooks';
import type { WeeklyLog } from '../db/db';
import { useT } from '../i18n';

type ScoreKey = 'comedones' | 'jaw' | 'irritation';
const ROWS: ScoreKey[] = ['comedones', 'jaw', 'irritation'];

export function Tracker({ week }: { week: number }) {
  const t = useT();
  const tr = t.tracker;
  const logs = useWeeklyLogs();
  const saved = logs.find((l) => l.week === week);
  const [draft, setDraft] = useState<WeeklyLog>({ week, comedones: null, jaw: null, irritation: null, note: '' });
  const [flash, setFlash] = useState(false);

  // Load the stored entry for this week once it arrives (or when the week changes).
  const savedKey = saved ? JSON.stringify(saved) : '';
  useEffect(() => {
    setDraft(saved ?? { week, comedones: null, jaw: null, irritation: null, note: '' });
  }, [week, savedKey]);

  async function save() {
    await saveWeeklyLog({ ...draft, week });
    setFlash(true);
    setTimeout(() => setFlash(false), 1500);
  }
  const f = (x: number | null) => (x === null || x === undefined ? '–' : x);

  return (
    <div className="section">
      <h3>
        {tr.title}{' '}
        <span className="h-sub">{tr.week(week)}</span>
      </h3>
      <p className="lead">{tr.lead}</p>
      {ROWS.map((key) => (
        <div className="trk-row" key={key}>
          <label id={`lbl-${key}`}>{tr.rows[key].label}</label>
          <div className="dots" role="radiogroup" aria-labelledby={`lbl-${key}`}>
            {[0, 1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                role="radio"
                aria-checked={draft[key] === v}
                className={draft[key] === v ? 'on' : ''}
                onClick={() => setDraft((d) => ({ ...d, [key]: v }))}
              >{v}</button>
            ))}
          </div>
        </div>
      ))}
      <textarea
        placeholder={tr.notePlaceholder}
        value={draft.note}
        onChange={(e) => { const note = e.target.value; setDraft((d) => ({ ...d, note })); }}
      />
      <div style={{ marginTop: 8 }}>
        <button className="pill ok" onClick={save}>{tr.save}</button>
        <span className={`saved${flash ? ' show' : ''}`}>{t.common.saved}</span>
      </div>
      {logs.length > 0 && (
        <div className="hist">
          <table>
            <thead><tr><th>{tr.history}</th>{ROWS.map((k) => <th key={k}>{tr.rows[k].short}</th>)}</tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.week}><td>{tr.weekRow(l.week)}</td><td>{f(l.comedones)}</td><td>{f(l.jaw)}</td><td>{f(l.irritation)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
