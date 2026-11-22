import { addDays, buildPhases, computeTips, dow, parseYmd, type LogScore, type PlanState } from './index';

const START = '2026-11-16'; // Monday
const phases = buildPhases(['snail', 'gly', 'fresh', 'anua']);
const plan = (over: Partial<PlanState> = {}): PlanState => ({
  settings: { start: START, climb: [2, 6], ret: null, gly: [3, 0] }, reintro: {}, resetVerdict: null, ...over,
});
/** Tips for plan week `w`, weekday `d` (0 = Sun). */
function tips(w: number, d: number, logs: LogScore[] = [], s = plan()) {
  const today = addDays(parseYmd(START), (w - 1) * 7 + ((d + 6) % 7));
  return computeTips({ phases, state: s, week: w, dow: dow(today), today, logs });
}
const ids = (t: ReturnType<typeof tips>) => t.map((x) => x.id);

describe('tips', () => {
  it('none before the plan starts', () => {
    const today = parseYmd('2026-11-10');
    expect(computeTips({ phases, state: plan(), week: 0, dow: 2, today, logs: [] })).toEqual([]);
  });

  it('R10: irritation ≥ 3 this week → tonight without active; warnings come first', () => {
    const t = tips(2, 5, [{ week: 2, irritation: 3 }]); // Friday after Thursday retinol
    expect(t[0]).toMatchObject({ id: 'irritationTonight', ruleId: 'R10', severity: 'warn' });
    expect(ids(t)).toContain('spfAfterActive');
  });

  it('R10: irritation last week also counts; two weeks in a row → lower frequency', () => {
    expect(ids(tips(3, 1, [{ week: 2, irritation: 4 }]))).toContain('irritationTonight');
    expect(ids(tips(3, 1, [{ week: 2, irritation: 4 }, { week: 3, irritation: 3 }]))).toContain('irritationLowerFreq');
    expect(ids(tips(3, 1, [{ week: 2, irritation: 2 }]))).not.toContain('irritationTonight');
  });

  it('R6: retinol night shows the ramp; at week 4 with irritation, hold at 1 night', () => {
    expect(ids(tips(1, 4))).toContain('retinolRamp'); // Thursday
    expect(ids(tips(4, 1, [{ week: 3, irritation: 3 }]))).toContain('retinolHold');
    expect(ids(tips(5, 1))).not.toContain('retinolRamp');
  });

  it('R5: sunscreen tip the morning after BHA or retinol', () => {
    expect(ids(tips(1, 3))).toContain('spfAfterActive'); // Wed, after Tue BHA
    expect(ids(tips(1, 2))).not.toContain('spfAfterActive'); // Tue, after Mon azelaic
  });

  it('back-to-back BHA and retinol (Mon retinol → Tue BHA from week 4)', () => {
    expect(ids(tips(4, 2))).toContain('activesBackToBack');
    expect(ids(tips(2, 2))).not.toContain('activesBackToBack');
  });

  it('does not look at the night before the plan started', () => {
    expect(ids(tips(1, 1))).not.toContain('spfAfterActive');
  });

  it('D4: trial focus with the day of the trial', () => {
    const t = tips(8, 0).find((x) => x.id === 'trialFocus'); // last day of Snail trial
    expect(t?.trial).toEqual({ id: 'snail', day: 14, of: 14 });
    expect(ids(tips(8, 0, [], plan({ reintro: { snail: 'bad' } })))).not.toContain('trialFocus');
  });

  it('Sunday check-in only if the week is not scored', () => {
    expect(ids(tips(1, 0))).toContain('weeklyCheckIn');
    expect(ids(tips(1, 0, [{ week: 1, irritation: 0 }]))).not.toContain('weeklyCheckIn');
  });
});
