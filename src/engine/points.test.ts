import {
  addDays, buildEvening, buildMorning, buildPhases, challengeStatus, computeScore, dayPoints,
  dow, levelFor, parseYmd, POINTS, SKIP_PREFIX, toYmd, weekNumber,
  type Checks, type PlanState, type ScoreInput,
} from './index';
import { adaRoutine } from './fixtures';

const START = '2026-11-16'; // Monday
const phases = buildPhases(['p9', 'p14', 'p18', 'p2']);
const plan = (over: Partial<PlanState> = {}): PlanState => ({
  settings: { start: START, climb: [2, 6], ret: null, gly: [3, 0] }, reintro: {}, resetVerdict: null, ...over,
});
const day = (n: number) => toYmd(addDays(parseYmd(START), n));

/** All steps of that day checked (optionally skipping the treatment). */
function full(ymd: string, s = plan(), skipTreatment = false): Checks {
  const date = parseYmd(ymd);
  const ctx = { phases, state: s, week: Math.max(weekNumber(START, date), 1), dow: dow(date), date, products: adaRoutine };
  const c: Checks = {};
  for (const st of [...buildMorning(ctx), ...buildEvening(ctx)]) c[st.id] = true;
  if (skipTreatment) { delete c.pm_treat; c[SKIP_PREFIX + 'pm_treat'] = true; }
  return c;
}
const input = (over: Partial<ScoreInput>): ScoreInput => ({
  phases, products: adaRoutine, state: plan(), today: parseYmd(day(0)), checksByDate: {}, noteDates: [], logs: [], ...over,
});

describe('points', () => {
  it('a full day: 1 per step + 5 per complete routine', () => {
    const d = day(0); // Mon, week 1: 4 AM + 5 PM steps
    const p = dayPoints(input({ checksByDate: { [d]: full(d) } }), d);
    expect(p.total).toBe(9 * POINTS.step + 2 * POINTS.routineComplete);
  });

  it('skipping the treatment on purpose still completes the night — no penalty', () => {
    const d = day(0);
    const a = dayPoints(input({ checksByDate: { [d]: full(d) } }), d).total;
    const b = dayPoints(input({ checksByDate: { [d]: full(d, plan(), true) } }), d).total;
    expect(b).toBe(a);
  });

  it('skipping when R10 is active earns the "listened" bonus', () => {
    const d = day(1);
    const p = dayPoints(input({ checksByDate: { [d]: full(d, plan(), true) }, logs: [{ week: 1, irritation: 3 }] }), d);
    expect(p.listened).toBe(true);
    expect(p.total).toBe(9 + 10 + POINTS.listenedToSkin);
  });

  it('a diary note adds points; a weekly log adds points once per week', () => {
    const s = computeScore(input({ noteDates: [day(0)], logs: [{ week: 1, irritation: 0 }] }));
    expect(s.totalPoints).toBe(POINTS.note + POINTS.weeklyLog);
  });

  it('a retinol night is not worth more than an azelaic night', () => {
    const ret = day(3); // Thursday retinol
    const az = day(4); // Friday azelaic
    const pr = dayPoints(input({ checksByDate: { [ret]: full(ret) } }), ret).total;
    const pa = dayPoints(input({ checksByDate: { [az]: full(az) } }), az).total;
    expect(pr).toBe(pa);
  });
});

describe('streaks and badges', () => {
  const days = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [day(i), full(day(i))]));

  it('streak counts up to today; an unfinished today does not break it', () => {
    const checks = days(5); // days 0..4 complete
    expect(computeScore(input({ checksByDate: checks, today: parseYmd(day(4)) })).streak).toBe(5);
    expect(computeScore(input({ checksByDate: checks, today: parseYmd(day(5)) })).streak).toBe(5);
    expect(computeScore(input({ checksByDate: checks, today: parseYmd(day(6)) })).streak).toBe(0);
  });

  it('a gap breaks the streak but best streak remembers', () => {
    const checks = { ...days(7) };
    delete checks[day(3)];
    const s = computeScore(input({ checksByDate: checks, today: parseYmd(day(6)) }));
    expect(s.streak).toBe(3);
    expect(s.bestStreak).toBe(3);
  });

  it('badges', () => {
    const s = computeScore(input({
      checksByDate: days(7), today: parseYmd(day(6)),
      noteDates: Array.from({ length: 7 }, (_, i) => day(i)),
    }));
    expect(s.badges).toEqual(['firstDay', 'streak7', 'diary7']);
    expect(computeScore(input({ state: plan({ reintro: { p9: 'ok' } }) })).badges).toContain('firstTrial');
  });

  it('future dates never count', () => {
    const d = day(3);
    expect(computeScore(input({ checksByDate: { [d]: full(d) }, today: parseYmd(day(0)) })).totalPoints).toBe(0);
  });

  it('levels', () => {
    expect(levelFor(0)).toEqual({ n: 0, from: 0, to: 100 });
    expect(levelFor(150)).toEqual({ n: 1, from: 100, to: 300 });
    expect(levelFor(5000).to).toBeNull();
  });
});

describe('challenge', () => {
  const ch = { name: 'Boda', date: '2027-05-15', createdAt: '2026-11-21' };

  it('days left and consistency', () => {
    const st = challengeStatus(ch, parseYmd('2026-11-23'), phases, plan(), ['2026-11-21', '2026-11-23']);
    expect(st.daysLeft).toBe(173);
    expect(st.daysTracked).toBe(3);
    expect(st.consistency).toBeCloseTo(2 / 3);
    expect(st.warnings).toEqual([]);
  });

  it('last 3 weeks: no new products (D4 + D5)', () => {
    const st = challengeStatus(ch, parseYmd('2027-04-30'), phases, plan(), []);
    expect(st.warnings).toContainEqual({ kind: 'noNewProducts', ruleId: 'D4+D5' });
  });

  it('warns when a pending trial (or its rest week) overlaps the event', () => {
    // Anua trial: weeks 13–14 → 2027-02-08 .. 2027-02-21, rest week to 2027-02-28
    const st = challengeStatus({ ...ch, date: '2027-02-25' }, parseYmd('2026-11-21'), phases, plan(), []);
    expect(st.warnings).toContainEqual({ kind: 'trialClash', ruleId: 'D4+D5', trial: 'p2', trialStart: '2027-02-08', trialEnd: '2027-02-21' });
    const done = challengeStatus({ ...ch, date: '2027-02-25' }, parseYmd('2026-11-21'), phases, plan({ reintro: { p2: 'ok' } }), []);
    expect(done.warnings.some((w) => w.kind === 'trialClash')).toBe(false);
  });

  it('after the event: past, consistency measured up to the event day', () => {
    const st = challengeStatus({ ...ch, date: '2026-11-22' }, parseYmd('2026-11-30'), phases, plan(), ['2026-11-21', '2026-11-25']);
    expect(st.isPast).toBe(true);
    expect(st.daysTracked).toBe(2);
    expect(st.daysComplete).toBe(1);
    expect(st.warnings).toEqual([]);
  });
});
