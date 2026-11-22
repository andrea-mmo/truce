import { useEffect, useMemo, useState } from 'react';
import ingredientsDb from './data/ingredients.json';
import {
  buildEvening, buildMorning, buildPhases, clampOffset, computeBanners, computeScore, computeTips, dateForOffset,
  adviseSteps, analyze, buildIndex, dayProgress, diaryTriage, effectiveSettings, parseYmd, profileStatus, productKey, proposeReset, readProduct, reintroQueue, SKIP_PREFIX,
  toRoutineProduct, type IngredientDb, type Product,
  dow as dowOf, MAX_DAYS_BACK, phaseFor, toYmd, treatmentFor, weekNumber, weekStrip,
} from './engine';
import { capitalize, fmtDate, useT } from './i18n';
import { phaseText, type PhaseProduct } from './i18n/phase';
import {
  saveChecks, saveReintroQueue, useAllChecks, useAppData, useChallenge, useChecks, useNoteDates, useProducts, useToday,
  useAllDiary, useRecentDiary, useWeeklyLogs,
} from './db/hooks';
import { Banners } from './components/Banners';
import { RoutineCard } from './components/RoutineCard';
import { WeekStrip } from './components/WeekStrip';
import { PlanTimeline } from './components/PlanTimeline';
import { Tracker } from './components/Tracker';
import { SettingsSheet } from './components/SettingsSheet';
import { DiaryCard } from './components/DiaryCard';
import { PhotosPage } from './components/PhotosPage';
import { TipsCard } from './components/TipsCard';
import { ProgressCard } from './components/ProgressCard';
import { ChallengeCard } from './components/ChallengeCard';
import { ProductsPage } from './components/ProductsPage';
import { Glyph } from './components/Glyph';
import { useAutoSync } from './sync/useSync';
import { QuizSheet } from './components/QuizSheet';
import { UpdateBar } from './components/UpdateBar';
import { DemoBar } from './components/DemoBar';

const index = buildIndex(ingredientsDb as IngredientDb);

type Tab = 'today' | 'products' | 'photos';
const HASH_BY_TAB: Record<Tab, string> = { today: '', products: '#productos', photos: '#fotos' };
const TAB_BY_HASH: Record<string, Tab> = { '#productos': 'products', '#fotos': 'photos' };

export default function App() {
  const t = useT();
  const now = useToday();
  useAutoSync();
  // 0 = today, -1 = yesterday… Stored as an offset so "today" follows midnight.
  const [offset, setOffset] = useState(0);
  const day = dateForOffset(now, offset);
  const dayKey = toYmd(day);
  const isToday = offset === 0;

  const data = useAppData();
  const checks = useChecks(dayKey);
  const logs = useWeeklyLogs();
  const allChecks = useAllChecks();
  const noteDates = useNoteDates();
  const challenge = useChallenge();
  const recentDiary = useRecentDiary(now);
  const allDiary = useAllDiary();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  // Simple tabs; kept in the URL hash so reloading stays on the same tab.
  const [tab, setTabState] = useState<Tab>(() => TAB_BY_HASH[location.hash] ?? 'today');
  const setTab = (t: Tab) => {
    setTabState(t);
    history.replaceState(null, '', t === 'today' ? location.pathname : HASH_BY_TAB[t]);
    window.scrollTo(0, 0);
  };
  const products = useProducts();

  // Library → what the routine and the plan need.
  const lib = useMemo(() => {
    const list = (products ?? []).filter((p): p is Product & { id: number } => p.id !== undefined);
    const readings = new Map(list.map((p) => [p.id, readProduct(p, index)]));
    const byId = new Map(list.map((p) => [p.id, p]));
    const byKey = new Map(list.map((p) => [productKey(p.id), p]));
    return {
      list,
      readings,
      routine: list.map((p) => toRoutineProduct(p, readings.get(p.id)!)),
      byId: (id: number) => byId.get(id),
      productOf: (key: string): PhaseProduct | undefined => {
        const p = byKey.get(key);
        return p && { name: p.name, category: p.category, actives: readings.get(p.id)!.actives.map((a) => a.activeClass) };
      },
      nameOf: (key: string) => byKey.get(key)?.name ?? t.common.product,
    };
  }, [products, t]);

  // First run: freeze the D4 reintroduction order computed from the library.
  const needsQueue = data !== undefined && data.reintroQueue === null && products !== undefined && products.length > 0;
  useEffect(() => {
    if (!needsQueue) return;
    const items = lib.list.filter((p) => p.status !== 'removed').map((p) => analyze(p, lib.readings.get(p.id)!));
    void saveReintroQueue(reintroQueue(proposeReset(items)));
  }, [needsQueue, lib]);

  const queue = data?.reintroQueue;
  const phases = useMemo(() => buildPhases(queue ?? []), [queue]);

  if (!data || !allChecks || challenge === undefined || !products) return null;
  const { triage, profile } = data;
  // The profile adjusts the plan (T4 → no retinoid nights).
  const plan = { ...data.plan, settings: effectiveSettings(data.plan.settings, profile) };
  const name = profile?.name.trim() ?? '';
  const week = weekNumber(plan.settings.start, day);
  const wk = week || 1;
  const dow = dowOf(day);
  const phase = phaseFor(phases, wk);
  const ctx = { phases, state: plan, week: wk, dow, date: day, products: lib.routine };
  const am = buildMorning(ctx);
  const pm = buildEvening(ctx);
  // Today's rules (R10, F1, F2) shown on the steps themselves.
  const adviceInput = { date: day, week, logs, diary: allDiary };
  const amAdvice = adviseSteps(am, lib.routine, adviceInput);
  const pmAdvice = adviseSteps(pm, lib.routine, adviceInput);
  // F5: warning signs marked in the diary add T7 to the pinned alarm.
  const allTriage = [...new Set([...triage, ...diaryTriage(recentDiary, now)])];
  const banners = computeBanners({ phases, state: plan, week, dow, today: day, triage: allTriage, viewingPast: !isToday, profile: profileStatus(profile) });

  // Tips are for today only.
  const tips = isToday ? computeTips({ phases, state: plan, week, dow, today: day, logs, diary: recentDiary, sportDays: profile?.sportDays, dailyMakeup: profile?.makeup === 'daily' }) : [];

  const go = (o: number) => setOffset(clampOffset(o));
  const h = now.getHours();
  // Small hours count as night: "Good morning" at 2:00 makes no sense.
  const greeting = h >= 6 && h < 13 ? t.app.greeting.morning : h >= 13 && h < 20 ? t.app.greeting.afternoon : t.app.greeting.night;
  const dateText = fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' });
  const dayLabel = offset === 0 ? t.common.today : offset === -1 ? t.common.yesterday : null;
  const chip = week === 0
    ? t.app.chipNotStarted
    : phase.id === 'reset'
      ? t.app.chipReset(week, phase.to)
      : t.app.chipPhase(week, phaseText(t, phase.id, lib.productOf(phase.id)).name);

  // Ticking a step clears a skip; skipping clears the tick.
  const toggle = (id: string) => saveChecks(dayKey, { ...checks, [id]: !checks[id], [SKIP_PREFIX + id]: false });
  const skip = (id: string) =>
    saveChecks(dayKey, { ...checks, [id]: false, [SKIP_PREFIX + id]: !checks[SKIP_PREFIX + id] });

  const scoreInput = { phases, products: lib.routine, state: plan, today: now, checksByDate: { ...allChecks, [dayKey]: checks }, noteDates, logs, diary: allDiary };
  const score = computeScore(scoreInput);
  const completeDates = Object.keys(scoreInput.checksByDate).filter((d) =>
    d <= toYmd(now) && dayProgress(phases, lib.routine, plan, parseYmd(d), scoreInput.checksByDate[d]).complete);

  return (
    <div className="wrap">
      <UpdateBar />
      <DemoBar />
      <header>
        <div>
          <div className="kicker">{t.app.kicker(name)}</div>
          <h1>{greeting}{name ? <>, <em>{name}</em></> : ''}</h1>
          <div className="daynav">
            <button className="navbtn" aria-label={t.app.prevDay} disabled={offset <= -MAX_DAYS_BACK} onClick={() => go(offset - 1)}>‹</button>
            <div className="date">
              {dayLabel && <b>{dayLabel} · </b>}
              {capitalize(dateText)}
            </div>
            <button className="navbtn" aria-label={t.app.nextDay} disabled={isToday} onClick={() => go(offset + 1)}>›</button>
            {!isToday && <button className="backtoday" onClick={() => go(0)}>{t.app.backToday}</button>}
          </div>
        </div>
        <div className="hdr-right">
          <span className="chip"><span className="dot" />{chip}</span>
          {score.streak > 0 && <span className="chip" title={t.app.streakTitle}><Glyph emoji="🔥" icon="flame" size={15} /> {score.streak}</span>}
          <button className="iconbtn" title={t.app.settings} aria-label={t.app.settings} onClick={() => setSettingsOpen(true)}>⚙</button>
        </div>
      </header>

      <nav className="tabs" aria-label={t.app.sections}>
        <button className={tab === 'today' ? 'on' : ''} aria-current={tab === 'today' ? 'page' : undefined} onClick={() => setTab('today')}>{t.app.tabToday}</button>
        <button className={tab === 'products' ? 'on' : ''} aria-current={tab === 'products' ? 'page' : undefined} onClick={() => setTab('products')}>{t.app.tabProducts}</button>
        <button className={tab === 'photos' ? 'on' : ''} aria-current={tab === 'photos' ? 'page' : undefined} onClick={() => setTab('photos')}>{t.app.tabPhotos}</button>
      </nav>

      {tab === 'products' ? <ProductsPage /> : tab === 'photos' ? <PhotosPage start={plan.settings.start} today={now} /> : (<>
      <Banners banners={banners} plan={plan} phases={phases} day={day} nameOf={lib.nameOf} onOpenQuiz={() => setQuizOpen(true)} />

        <div className="routines">
          <RoutineCard kind="am" title={t.app.morning} subtitle={t.app.steps(am.length)} steps={am} checks={checks} productById={lib.byId} advice={amAdvice} onToggle={toggle} onSkip={skip} />
          <RoutineCard
            kind="pm" title={t.app.evening}
            subtitle={t.app.tonight(isToday, t.treatment[treatmentFor(plan.settings, dow, wk)].short)}
            steps={pm} checks={checks} productById={lib.byId} advice={pmAdvice} onToggle={toggle} onSkip={skip}
          />
        </div>

        <TipsCard tips={tips} nameOf={lib.nameOf} />

        <DiaryCard date={day} today={now} onOpenDay={go} recentDiary={recentDiary} onOpenPhotos={() => { setTab('photos'); window.scrollTo(0, 0); }} />

        <div className="grid2">
          <ProgressCard score={score} />
          <ChallengeCard challenge={challenge} today={now} phases={phases} plan={plan} completeDates={completeDates} nameOf={lib.nameOf} />
        </div>

        <WeekStrip days={weekStrip(plan.settings, day)} today={now} selected={day} onPick={go} />

        <div className="grid2">
          <PlanTimeline phases={phases} week={wk} plan={plan} productOf={lib.productOf} />
          <Tracker week={wk} />
        </div>
      </>)}

      <p className="foot">{t.app.foot}</p>

      {quizOpen && (
        <QuizSheet initial={profile} hasChallenge={!!challenge} today={now} onClose={() => setQuizOpen(false)} />
      )}

      <SettingsSheet
        profile={profile}
        onOpenQuiz={() => { setSettingsOpen(false); setQuizOpen(true); }}
        open={settingsOpen}
        settings={plan.settings}
        week={wk}
        onClose={() => setSettingsOpen(false)}
        onClearDay={() => saveChecks(dayKey, {})}
        clearLabel={isToday ? t.app.clearToday : t.app.clearDay}
      />
    </div>
  );
}
