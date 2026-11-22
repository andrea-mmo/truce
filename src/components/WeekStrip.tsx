import { Glyph } from './Glyph';
import type { StripDay } from '../engine';
import { offsetFor, toYmd } from '../engine';
import { fmtDate, useT } from '../i18n';

interface Props {
  days: StripDay[];
  today: Date;
  selected: Date;
  onPick: (offset: number) => void;
}

export function WeekStrip({ days, today, selected, onPick }: Props) {
  const t = useT();
  const todayKey = toYmd(today);
  const selKey = toYmd(selected);
  return (
    <div className="section weeksec">
      <h3>{t.week.title}</h3>
      <p className="lead">{t.week.lead}</p>
      <div className="week">
        {days.map((d) => {
          const key = toYmd(d.date);
          const off = offsetFor(today, d.date);
          const cls = `day ${d.treatment}${key === todayKey ? ' today' : ''}${key === selKey && key !== todayKey ? ' sel' : ''}${off !== null ? ' pickable' : ''}`;
          const inner = (
            <>
              <div className="dn">{t.common.dayShort[d.dow]} {d.date.getDate()}</div>
              <div className="dt">
                <span className="full">{t.treatment[d.treatment].short}</span>
                <span className="tiny" aria-hidden="true">{t.treatment[d.treatment].tiny}</span>
              </div>
              <div className="cl">{d.climb && <><Glyph emoji="🧗" icon="activity" size={13} /><span className="lbl">{t.week.climb}</span></>}</div>
            </>
          );
          return off === null ? (
            <div key={key} className={cls}>{inner}</div>
          ) : (
            <button
              key={key}
              className={cls}
              aria-current={key === selKey ? 'date' : undefined}
              aria-label={t.week.open(fmtDate(d.date, { weekday: 'long', day: 'numeric' }))}
              onClick={() => onPick(off)}
            >{inner}</button>
          );
        })}
      </div>
      <div className="rules">
        {t.week.rules.map((r) => <div key={r.bold} className="rule"><b>{r.bold}</b>{r.rest}</div>)}
      </div>
    </div>
  );
}
