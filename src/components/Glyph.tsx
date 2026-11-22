/**
 * Emoji in the playful styles, thin line icon in the "Clínico" style.
 * Both are rendered; CSS shows one or the other (see styles.css).
 */
export type IconName =
  | 'alert' | 'calendar' | 'book' | 'activity' | 'sprout' | 'search' | 'check'
  | 'sun' | 'moon' | 'flame' | 'camera' | 'image';

const PATHS: Record<IconName, React.ReactNode> = {
  alert: <><path d="M12 3 2.5 20h19L12 3z" /><path d="M12 10v4M12 17.5v.01" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16" /></>,
  activity: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  sprout: <><path d="M12 21v-8" /><path d="M12 13c0-4-3-6-7-6 0 4 3 6 7 6zM12 11c0-3 2.5-5 6-5 0 3-2.5 5-6 5z" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.8 2.8L16.5 9.5" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M5.2 18.8l1.4-1.4M17.4 6.6l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  flame: <path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.5 2.6-5.6 3.5-9 1.9 1.4 3 3 3.2 5 1-1 1.6-2.2 1.8-3.6 2.5 2 4.5 4.8 4.5 7.6 0 3.4-2.6 6-6.5 6z" />,
  camera: <><path d="M4 8h3l2-2.5h6L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 18 5-5 4 4 3-3 4 4" /></>,
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg className="lineicon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

export function Glyph({ emoji, icon, size }: { emoji: string; icon: IconName; size?: number }) {
  return (
    <>
      <span className="emo" aria-hidden="true">{emoji}</span>
      <Icon name={icon} size={size} />
    </>
  );
}
