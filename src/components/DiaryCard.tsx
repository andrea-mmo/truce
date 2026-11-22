import { useEffect, useRef, useState } from 'react';
import { DIARY_TAGS, offsetFor, parseYmd, tagCounts, toYmd, type DiaryDay, type DiaryTag } from '../engine';
import { saveDailyNote, saveDailyTags, useDailyNote, useRecentNotes } from '../db/hooks';
import { fmtDate, useT, type Messages } from '../i18n';
import { usePhotosFor } from '../db/photos';

interface Props {
  date: Date;
  today: Date;
  onOpenDay: (offset: number) => void;
  /** Last 30 days of tags, for the patterns line. */
  recentDiary: DiaryDay[];
  /** Photos live in their own tab; the diary only links there. */
  onOpenPhotos: () => void;
}

const SAVE_DELAY_MS = 600;

function niceDate(t: Messages, ymd: string, today: Date) {
  const d = parseYmd(ymd);
  const off = offsetFor(today, d);
  if (off === 0) return t.common.today;
  if (off === -1) return t.common.yesterday;
  return fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function DiaryCard({ date, today, onOpenDay, recentDiary, onOpenPhotos }: Props) {
  const t = useT();
  const dt = t.diary;
  const key = toYmd(date);
  const stored = useDailyNote(key);
  const photoCount = usePhotosFor(key).length;
  const recent = useRecentNotes(6).filter((n) => n.date !== key).slice(0, 5);

  // Local draft while typing; null = show what's stored.
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const pending = useRef<{ key: string; text: string; timer: number } | null>(null);

  function flush() {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    saveDailyNote(p.key, p.text).then(() => setStatus('saved'));
  }

  // Changing day (or leaving): save what was typed, then show the new day's note.
  useEffect(() => {
    setDraft(null);
    setStatus('idle');
    return flush;
  }, [key]);

  function onChange(text: string) {
    setDraft(text);
    setStatus('saving');
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = { key, text, timer: window.setTimeout(flush, SAVE_DELAY_MS) };
  }

  const value = draft ?? stored?.note ?? '';
  const isToday = offsetFor(today, date) === 0;
  const tags = stored?.tags ?? [];
  const toggleTag = (tag: DiaryTag) => {
    // Save any pending text first so both end up in the same entry.
    flush();
    void saveDailyTags(key, tags.includes(tag) ? tags.filter((x) => x !== tag) : [...tags, tag]);
  };
  const counts = tagCounts(recentDiary, today, 30);
  const patterns = DIARY_TAGS.filter((tag) => (counts[tag] ?? 0) > 0);

  return (
    <div className="section diary">
      <h3>{dt.title} <span className="h-sub">· {niceDate(t, key, today).toLowerCase()}</span></h3>
      <p className="lead">
        {isToday ? dt.leadToday : dt.leadPast} {dt.lead}
      </p>
      <div className="tagpick" role="group" aria-label={dt.tagsLabel}>
        {DIARY_TAGS.map((tag) => (
          <button
            key={tag}
            className={`dtag${tags.includes(tag) ? ' on' : ''}${tag === 'warningSigns' ? ' alarm' : ''}`}
            aria-pressed={tags.includes(tag)}
            disabled={stored === undefined}
            onClick={() => toggleTag(tag)}
          >{dt.tag[tag]}</button>
        ))}
      </div>
      <textarea
        aria-label={dt.noteLabel}
        rows={3}
        value={value}
        disabled={stored === undefined}
        placeholder={dt.notePlaceholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={flush}
      />
      <div className="diary-status" aria-live="polite">
        {status === 'saving' ? t.common.saving : status === 'saved' ? t.common.saved : ''}
      </div>

      <button type="button" className="diary-photos-link" onClick={onOpenPhotos}>
        📷 {photoCount > 0 ? dt.photosLink(photoCount) : dt.photosAdd}
      </button>

      {patterns.length > 0 && (
        <div className="diary-patterns">
          <span className="diary-list-title">{dt.last30}</span>
          {patterns.map((tag) => <span key={tag} className="pat">{dt.tag[tag]} <b>{counts[tag]}</b></span>)}
        </div>
      )}

      {recent.length > 0 && (
        <div className="diary-list">
          <div className="diary-list-title">{dt.previous}</div>
          {recent.map((n) => {
            const off = offsetFor(today, parseYmd(n.date));
            const body = (
              <>
                <span className="dl-date">{niceDate(t, n.date, today)}</span>
                <span className="dl-text">
                  {(n.tags ?? []).length > 0 && (
                    <span className="dl-tags">{(n.tags ?? []).map((tag) => <span key={tag} className={`dtag mini${tag === 'warningSigns' ? ' alarm' : ''}`}>{dt.tag[tag]}</span>)}</span>
                  )}
                  {n.note}
                </span>
              </>
            );
            return off === null ? (
              <div key={n.date} className="dl-item">{body}</div>
            ) : (
              <button key={n.date} className="dl-item link" onClick={() => onOpenDay(off)}>{body}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}
