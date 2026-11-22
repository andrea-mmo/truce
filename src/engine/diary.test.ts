import { addDays, buildPhases, computeTips, diaryTriage, parseYmd, tagCounts, toYmd, type DiaryDay, type PlanState } from './index';

const today = parseYmd('2026-11-22');
const d = (offset: number, ...tags: DiaryDay['tags']): DiaryDay => ({ date: toYmd(addDays(today, offset)), tags });
const phases = buildPhases(['p9', 'p14']);
const plan = (start: string): PlanState => ({ settings: { start, climb: [2, 6], ret: null, gly: [3, 0] }, reintro: {}, resetVerdict: null });
const tips = (diary: DiaryDay[], start = '2026-11-21', logs = [] as { week: number; irritation: number | null }[]) =>
  computeTips({ phases, state: plan(start), week: Math.floor((today.getTime() - parseYmd(start).getTime()) / 864e5 / 7) + 1, dow: 0, today, logs, diary }).map((t) => [t.id, t.ruleId]);

describe('diary tags (REGLAS F)', () => {
  it('F5: warning signs → T7 today and the 2 following days, then it stops', () => {
    expect(diaryTriage([d(0, 'warningSigns')], today)).toEqual(['T7']);
    expect(diaryTriage([d(-2, 'warningSigns')], today)).toEqual(['T7']);
    expect(diaryTriage([d(-3, 'warningSigns')], today)).toEqual([]);
    expect(diaryTriage([d(0, 'breakout')], today)).toEqual([]);
  });

  it('F1: stinging today → tonight without treatment, replacing the weekly R10 tip', () => {
    const t = tips([d(0, 'stinging')], '2026-11-21', [{ week: 1, irritation: 4 }]);
    expect(t).toContainEqual(['stingingTonight', 'F1']);
    expect(t.map((x) => x[0])).not.toContain('irritationTonight');
    expect(tips([d(-1, 'stinging')]).map((x) => x[0])).not.toContain('stingingTonight');
  });

  it('F2: picked today or yesterday', () => {
    expect(tips([d(0, 'picked')])).toContainEqual(['afterPicking', 'F2']);
    expect(tips([d(-1, 'picked')])).toContainEqual(['afterPicking', 'F2']);
    expect(tips([d(-2, 'picked')]).map((x) => x[0])).not.toContain('afterPicking');
  });

  it('F3: new product — warning during a trial, reminder otherwise', () => {
    expect(tips([d(0, 'newProduct')])).toContainEqual(['newProductOneByOne', 'F3']);
    // Week 7 = first week of the first trial.
    expect(tips([d(0, 'newProduct')], toYmd(addDays(today, -6 * 7)))).toContainEqual(['newProductInTrial', 'F3']);
  });

  it('F4: makeup → double cleanse', () => {
    expect(tips([d(0, 'makeup')])).toContainEqual(['makeupDoubleCleanse', 'F4']);
  });

  it('F6 tags only count for patterns, no tips', () => {
    expect(tips([d(0, 'period', 'badSleep', 'stress', 'breakout')]).filter((x) => String(x[1]).startsWith('F'))).toEqual([]);
    expect(tagCounts([d(0, 'period', 'stress'), d(-5, 'stress'), d(-40, 'stress')], today)).toEqual({ period: 1, stress: 2 });
  });

  it('diary tips also work before the plan starts', () => {
    expect(tips([d(0, 'picked')], '2026-12-01')).toContainEqual(['afterPicking', 'F2']);
  });
});
