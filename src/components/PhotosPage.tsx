import { parseYmd, toYmd, weekNumber } from '../engine';
import type { Photo } from '../db/db';
import { deletePhoto, useAllPhotos } from '../db/photos';
import { fmtDate, useT } from '../i18n';
import { ComparePhotos } from './ComparePhotos';
import { DiaryPhotos, Thumb } from './DiaryPhotos';

interface Props {
  /** Plan start (YYYY-MM-DD), to label photos by week. */
  start: string;
  today: Date;
}

/** Photos tab: add today's photos, compare two dates, and the full gallery by day. */
export function PhotosPage({ start, today }: Props) {
  const t = useT();
  const p = t.photosPage;
  const photos = useAllPhotos();
  const todayKey = toYmd(today);

  // Newest day first; today's photos are already shown in the upload block.
  const byDay = new Map<string, Photo[]>();
  for (const ph of [...photos].reverse()) {
    if (ph.date === todayKey) continue;
    byDay.set(ph.date, [...(byDay.get(ph.date) ?? []), ph]);
  }

  const remove = (id: number) => { if (window.confirm(t.photos.confirmDelete)) void deletePhoto(id); };

  return (
    <div className="photos-page">
      <div className="section">
        <h3>{p.todayTitle}</h3>
        <p className="lead">{p.todayLead}</p>
        <DiaryPhotos date={todayKey} />
      </div>

      <ComparePhotos start={start} />

      <div className="section">
        <h3>{p.galleryTitle}</h3>
        {byDay.size === 0 ? <p className="lead">{p.galleryEmpty}</p> : [...byDay].map(([date, list]) => {
          const w = weekNumber(start, parseYmd(date));
          return (
            <div key={date} className="ph-day">
              <div className="ph-day-h">
                {fmtDate(parseYmd(date), { weekday: 'short', day: 'numeric', month: 'short' })}
                {w > 0 && <span> · {t.compare.week(w)}</span>}
              </div>
              <div className="ph-row">{list.map((ph) => <Thumb key={ph.id} photo={ph} onDelete={() => remove(ph.id!)} />)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
