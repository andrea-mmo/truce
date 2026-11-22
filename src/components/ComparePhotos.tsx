import { useState } from 'react';
import { daysApart, defaultComparison, parseYmd, weekNumber } from '../engine';
import type { Photo } from '../db/db';
import { useAllPhotos, useObjectUrl } from '../db/photos';
import { fmtDate, useT, type Messages } from '../i18n';

function label(t: Messages, p: Photo, start: string, sameDayIndex: number) {
  const date = parseYmd(p.date);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const d = fmtDate(date, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
  const w = weekNumber(start, date);
  return `${d}${w > 0 ? ` · ${t.compare.week(w)}` : ''}${sameDayIndex > 0 ? ` · ${t.compare.nth(sameDayIndex + 1)}` : ''}`;
}

export function ComparePhotos({ start }: { start: string }) {
  const t = useT();
  const c = t.compare;
  const photos = useAllPhotos();
  const [beforeId, setBeforeId] = useState<number | null>(null);
  const [afterId, setAfterId] = useState<number | null>(null);
  const [mode, setMode] = useState<'side' | 'slide'>('side');
  const [split, setSplit] = useState(50);

  const def = defaultComparison(photos as (Photo & { id: number })[]);
  const before = photos.find((p) => p.id === beforeId) ?? def?.before;
  const after = photos.find((p) => p.id === afterId) ?? def?.after;
  const beforeUrl = useObjectUrl(before?.blob);
  const afterUrl = useObjectUrl(after?.blob);

  if (!def || !before || !after) {
    return (
      <div className="section compare">
        <h3>{c.title}</h3>
        <p className="lead">{c.empty}</p>
      </div>
    );
  }

  const labels = new Map<number, string>();
  const perDay = new Map<string, number>();
  for (const p of photos) {
    const i = perDay.get(p.date) ?? 0;
    perDay.set(p.date, i + 1);
    labels.set(p.id!, label(t, p, start, i));
  }
  const options = photos.map((p) => <option key={p.id} value={p.id}>{labels.get(p.id!)}</option>);
  const gap = daysApart(before as Photo & { id: number }, after as Photo & { id: number });

  return (
    <div className="section compare">
      <h3>{c.title}</h3>
      <p className="lead">
        {gap === 0 ? c.sameDay : c.gap(gap)} {c.light}
      </p>
      <div className="cmp-pick">
        <label><span>{c.before}</span>
          <select value={before.id} onChange={(e) => setBeforeId(Number(e.target.value))}>{options}</select>
        </label>
        <label><span>{c.after}</span>
          <select value={after.id} onChange={(e) => setAfterId(Number(e.target.value))}>{options}</select>
        </label>
      </div>
      <div className="cmp-mode" role="group" aria-label={c.modeLabel}>
        <button className={mode === 'side' ? 'on' : ''} aria-pressed={mode === 'side'} onClick={() => setMode('side')}>{c.side}</button>
        <button className={mode === 'slide' ? 'on' : ''} aria-pressed={mode === 'slide'} onClick={() => setMode('slide')}>{c.slide}</button>
      </div>

      {mode === 'side' ? (
        <div className="cmp-side">
          <figure><img src={beforeUrl} alt={c.beforeAlt} /><figcaption>{c.before} · {labels.get(before.id!)}</figcaption></figure>
          <figure><img src={afterUrl} alt={c.afterAlt} /><figcaption>{c.after} · {labels.get(after.id!)}</figcaption></figure>
        </div>
      ) : (
        <div className="cmp-slide">
          <div className="cmp-stage" style={{ aspectRatio: `${after.w} / ${after.h}` }}>
            <img src={afterUrl} alt={c.afterAlt} />
            <img src={beforeUrl} alt={c.beforeAlt} style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} />
            <div className="cmp-line" style={{ left: `${split}%` }} aria-hidden="true" />
            <span className="cmp-tag l">{c.before}</span><span className="cmp-tag r">{c.after}</span>
          </div>
          <input type="range" min={0} max={100} value={split} aria-label={c.sliderLabel} onChange={(e) => setSplit(Number(e.target.value))} />
        </div>
      )}
    </div>
  );
}
