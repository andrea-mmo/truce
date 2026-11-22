import { addDays, adviseSteps, buildEvening, buildMorning, buildPhases, dayPoints, dow, parseYmd, POINTS, SKIP_PREFIX, toYmd, treatmentAdvice, type DiaryDay } from './index';
import { ADA_QUEUE, adaRoutine, prod } from './fixtures';

const START = '2026-11-16';
const state = { settings: { start: START, climb: [2, 6] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[], ret: null, gly: [3, 0] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[] }, reintro: {}, resetVerdict: null };
const phases = buildPhases(ADA_QUEUE);
const at = (date: string, week: number) => { const d = parseYmd(date); return { phases, state, week, dow: dow(d), date: d, products: adaRoutine }; };
const tag = (date: string, ...tags: DiaryDay['tags']): DiaryDay => ({ date, tags });

describe('advice on routine steps', () => {
  it('F1 stinging today → the treatment step says skip', () => {
    const date = parseYmd('2026-11-17');
    expect(treatmentAdvice({ date, week: 1, logs: [], diary: [tag('2026-11-17', 'stinging')] })).toEqual({ kind: 'skip', ruleId: 'F1' });
    const steps = buildEvening(at('2026-11-17', 1));
    expect(adviseSteps(steps, adaRoutine, { date, week: 1, logs: [], diary: [tag('2026-11-17', 'stinging')] })).toEqual({ pm_treat: { kind: 'skip', ruleId: 'F1' } });
  });

  it('R10 irritation ≥ 3 this week → skip', () => {
    expect(treatmentAdvice({ date: parseYmd('2026-11-17'), week: 1, logs: [{ week: 1, irritation: 3 }], diary: [] })).toEqual({ kind: 'skip', ruleId: 'R10' });
  });

  it('F2 picked today or yesterday → caution (not skip)', () => {
    expect(treatmentAdvice({ date: parseYmd('2026-11-18'), week: 1, logs: [], diary: [tag('2026-11-17', 'picked')] })).toEqual({ kind: 'caution', ruleId: 'F2' });
    expect(treatmentAdvice({ date: parseYmd('2026-11-19'), week: 1, logs: [], diary: [tag('2026-11-17', 'picked')] })).toBeNull();
  });

  it('a glycolic morning gets the same mark; other morning steps do not', () => {
    // Week 9, Wednesday: glycolic is in the morning routine.
    const wed = toYmd(addDays(parseYmd(START), 8 * 7 + 2));
    const steps = buildMorning(at(wed, 9));
    const marks = adviseSteps(steps, adaRoutine, { date: parseYmd(wed), week: 9, logs: [], diary: [tag(wed, 'stinging')] });
    expect(Object.keys(marks)).toEqual([`am:p${prod('Norra', 'Glow Tonic').id}`]);
  });

  it('skipping on an advised day earns the bonus (F1 too, not only R10)', () => {
    const d = '2026-11-17';
    const ctx = at(d, 1);
    const checks: Record<string, boolean> = {};
    for (const s of [...buildMorning(ctx), ...buildEvening(ctx)]) checks[s.id] = true;
    delete checks.pm_treat;
    checks[SKIP_PREFIX + 'pm_treat'] = true;
    const input = (diary: DiaryDay[]) => ({ phases, products: adaRoutine, state, today: parseYmd(d), checksByDate: { [d]: checks }, noteDates: [], logs: [], diary });
    expect(dayPoints(input([tag(d, 'stinging')]), d).listened).toBe(true);
    expect(dayPoints(input([]), d).listened).toBe(false);
    expect(dayPoints(input([tag(d, 'stinging')]), d).total - dayPoints(input([]), d).total).toBe(POINTS.listenedToSkin);
  });
});
