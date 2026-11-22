import type { Dow, Profile, Settings } from '../engine';
import { retinolClimbClashes, retinolMode, retinolNights, toggleDay, WEEK_ORDER } from '../engine';
import { fmtDate, LANGS, setLang, useLang, useT } from '../i18n';
import { saveSettings } from '../db/hooks';
import { DataSection } from './DataSection';
import { SyncSection } from './SyncSection';
import { IS_DEMO } from '../demo';
import { VersionSection } from './VersionSection';
import { useState } from 'react';
import { applyTheme, loadTheme, THEMES } from '../theme';

interface Props {
  profile: Profile | null;
  onOpenQuiz: () => void;
  open: boolean;
  settings: Settings;
  week: number;
  onClose: () => void;
  onClearDay: () => void;
  clearLabel: string;
}

function DayPick({ selected, onToggle, cls = '' }: { selected: Dow[]; onToggle: (d: Dow) => void; cls?: string }) {
  const t = useT();
  return (
    <div className={`daypick ${cls}`}>
      {WEEK_ORDER.map((d) => (
        <button key={d} className={selected.includes(d) ? 'on' : ''} aria-pressed={selected.includes(d)} onClick={() => onToggle(d)}>
          {t.common.dayShort[d]}
        </button>
      ))}
    </div>
  );
}

function LanguagePicker() {
  const t = useT();
  const lang = useLang();
  return (
    <div className="field">
      <div className="lb">{t.settings.language}</div>
      <div className="stylepick" role="radiogroup" aria-label={t.settings.language}>
        {LANGS.map((l) => (
          <button key={l.id} role="radio" lang={l.id} aria-checked={lang === l.id} className={lang === l.id ? 'on' : ''} onClick={() => setLang(l.id)}>
            {l.name}
          </button>
        ))}
      </div>
      <div className="hint">{t.settings.languageHint}</div>
    </div>
  );
}

function StylePicker() {
  const t = useT();
  const [theme, setTheme] = useState(loadTheme);
  return (
    <div className="field">
      <div className="lb">{t.settings.style}</div>
      <div className="stylepick" role="radiogroup" aria-label={t.settings.style}>
        {THEMES.map((th) => (
          <button
            key={th.id} role="radio" aria-checked={theme === th.id} className={theme === th.id ? 'on' : ''}
            onClick={() => { applyTheme(th.id); setTheme(th.id); }}
          >
            <span className="sw">{th.swatch.map((c) => <i key={c} style={{ background: c, border: '1px solid rgba(0,0,0,.08)' }} />)}</span>
            {t.settings.themes[th.id].name}
          </button>
        ))}
      </div>
      <div className="hint">{t.settings.styleHint(t.settings.themes[theme].hint)}</div>
    </div>
  );
}

export function SettingsSheet({ open, settings, week, onClose, onClearDay, clearLabel, profile, onOpenQuiz }: Props) {
  const t = useT();
  const s9 = t.settings;
  if (!open) return null;
  const set = (patch: Partial<Settings>) => saveSettings({ ...settings, ...patch });
  const ret = retinolNights(settings, week);
  const clash = retinolClimbClashes(settings, week);

  return (
    <div className="modal open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={s9.title}>
        <h3>{s9.title}</h3>
        <div className="field">
          <div className="lb">{s9.profile}</div>
          <div className="hint" style={{ marginTop: 0 }}>
            {profile?.reviewedAt
              ? s9.profileSummary(profile.name, profile.skinType ? t.profile.skin[profile.skinType] : null, fmtDate(new Date(profile.reviewedAt), { day: 'numeric', month: 'long' }))
              : s9.profilePending}
            {profile?.triage.T4 === 'yes' && s9.retinolPaused}
          </div>
          <div className="data-btns"><button className="btn ghost" onClick={onOpenQuiz}>{profile?.reviewedAt ? s9.redoQuiz : s9.doQuiz}</button></div>
        </div>
        <LanguagePicker />
        <StylePicker />
        <div className="field">
          <div className="lb">{s9.start}</div>
          <input type="date" value={settings.start} onChange={(e) => e.target.value && set({ start: e.target.value })} />
          <div className="hint">{s9.startHint}</div>
        </div>
        <div className="field">
          <div className="lb">{s9.climb}</div>
          <DayPick selected={settings.climb} onToggle={(d) => set({ climb: toggleDay(settings.climb, d) })} />
        </div>
        <div className="field">
          <div className="lb">{s9.retinol}</div>
          <DayPick cls="ret" selected={ret} onToggle={(d) => set({ ret: toggleDay(ret, d, 2) })} />
          <div className="hint">{s9.retinolHint[retinolMode(settings, week)]}</div>
          {clash.length > 0 && (
            <div className="warn">
              {s9.clash(clash.map((d) => t.common.dayShort[d]).join(', '))}
            </div>
          )}
        </div>
        <div className="field">
          <div className="lb">{s9.gly}</div>
          <DayPick selected={settings.gly} onToggle={(d) => set({ gly: toggleDay(settings.gly, d, 2) })} />
          <div className="hint">{s9.glyHint}</div>
        </div>
        {IS_DEMO ? <div className="field"><div className="lb">{t.demo.syncTitle}</div><div className="hint" style={{ marginTop: 0 }}>{t.demo.syncOff}</div></div> : <SyncSection />}
        <DataSection />
        <VersionSection />
        <div className="row">
          <button className="btn ghost" onClick={onClearDay}>{clearLabel}</button>
          <button className="btn" onClick={onClose}>{t.common.done}</button>
        </div>
      </div>
    </div>
  );
}
