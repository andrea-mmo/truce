import {
  addDays, buildEvening, buildMorning, buildPhases, computeBanners, dayIndex, isSummer,
  parseYmd, phaseFor, retinolClimbClashes, retinolMode, retinolNights, timeline, toggleDay,
  toYmd, weekNumber, weekStrip, type PlanState, type Settings,
} from './index';
import { ADA_QUEUE, adaRoutine, prod } from './fixtures';

const base: Settings = { start: '2026-11-16', climb: [2, 6], ret: null, gly: [3, 0] };
const phases = buildPhases(['snail', 'gly', 'fresh', 'anua']);
const st = (over: Partial<PlanState> = {}): PlanState => ({ settings: base, reintro: {}, resetVerdict: null, ...over });

describe('dates', () => {
  it('week number', () => {
    expect(weekNumber('2026-11-16', parseYmd('2026-11-15'))).toBe(0);
    expect(weekNumber('2026-11-16', parseYmd('2026-11-16'))).toBe(1);
    expect(weekNumber('2026-11-16', parseYmd('2026-11-22'))).toBe(1);
    expect(weekNumber('2026-11-16', parseYmd('2026-11-23'))).toBe(2);
  });

  it('is not thrown off by daylight saving (UK clocks change 29 Mar 2026)', () => {
    expect(dayIndex('2026-03-22', parseYmd('2026-03-29'))).toBe(7);
    expect(weekNumber('2026-03-22', parseYmd('2026-03-29'))).toBe(2);
    expect(dayIndex('2026-10-18', parseYmd('2026-10-25'))).toBe(7);
  });

  it('ymd round trip and summer', () => {
    expect(toYmd(parseYmd('2026-01-05'))).toBe('2026-01-05');
    expect(isSummer(parseYmd('2026-07-01'))).toBe(true);
    expect(isSummer(parseYmd('2026-09-01'))).toBe(false);
  });
});

describe('phases', () => {
  it('phaseFor clamps week 0 to the reset and goes to maintenance at the end', () => {
    expect(phaseFor(phases, 0).id).toBe('reset');
    expect(phaseFor(phases, 8).id).toBe('snail');
    expect(phaseFor(phases, 40).id).toBe('keep');
  });

  it('timeline statuses', () => {
    const t = timeline(phases, 9).map((x) => x.status);
    expect(t).toEqual(['past', 'past', 'now', 'future', 'future', 'future']);
  });
});

describe('schedule', () => {
  it('manual retinol nights override the ramp-up', () => {
    expect(retinolNights({ ...base, ret: [5] }, 1)).toEqual([5]);
    expect(retinolMode({ ...base, ret: [5] }, 1)).toBe('manual');
    expect(retinolMode(base, 3)).toBe('auto-early');
    expect(retinolMode(base, 4)).toBe('auto-later');
  });

  it('reports retinol nights that fall on climbing days', () => {
    expect(retinolClimbClashes({ ...base, ret: [2, 4] }, 1)).toEqual([2]);
    expect(retinolClimbClashes(base, 1)).toEqual([]);
  });

  it('toggleDay keeps at most `max` days, dropping the oldest', () => {
    expect(toggleDay([1, 4], 4)).toEqual([1]);
    expect(toggleDay([1, 4], 5, 2)).toEqual([4, 5]);
    expect(toggleDay([], 0)).toEqual([0]);
  });

  it('week strip before the start uses week 1 rules and marks today', () => {
    const strip = weekStrip({ ...base, start: '2026-12-01' }, parseYmd('2026-11-18'));
    expect(strip.map((d) => d.week)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(strip.find((d) => d.isToday)?.dow).toBe(3);
  });
});

describe('routine', () => {
  const ctx = (week: number, dow: 0 | 1 | 2 | 3 | 4 | 5 | 6, s = st(), date = parseYmd('2026-11-18')) =>
    ({ phases: buildPhases(ADA_QUEUE), state: s, week, dow, date, products: adaRoutine });
  const gly = prod('Norra', 'Glow Tonic').id;
  const ids = (steps: ReturnType<typeof buildMorning>) => steps.map((x) => x.productId);

  it('glycolic is skipped the morning after a retinol night', () => {
    // Retinol on Tuesday → no glycolic on Wednesday.
    const s = st({ settings: { ...base, climb: [6], ret: [2] } });
    expect(ids(buildMorning(ctx(9, 3, s)))).not.toContain(gly);
    expect(ids(buildMorning(ctx(9, 3)))).toContain(gly);
  });

  it('tags: in trial vs. kept afterwards', () => {
    const night = prod('Norra', 'Rich Repair').id;
    // Night cream: 4th in the queue, on trial in weeks 13–14.
    expect(buildEvening(ctx(13, 1)).find((x) => x.productId === night)?.tag).toEqual({ style: 'new', label: 'trial' });
    expect(buildEvening(ctx(15, 1)).find((x) => x.productId === night)?.tag).toEqual({ style: 'opt', label: 'nightCream' });
    expect(buildMorning(ctx(11, 3)).find((x) => x.productId === gly)?.tag).toEqual({ style: 'opt', label: 'glyToday' });
  });

  it('summer swaps the day cream (Cooling Water Cream), the night cream stays', () => {
    const summer = prod('Plain Theory', 'Cooling').id;
    const gel = prod('Plain Theory', 'Daily Gel').id;
    expect(ids(buildMorning(ctx(1, 1, st(), parseYmd('2026-07-10'))))).toContain(summer);
    expect(ids(buildMorning(ctx(1, 1, st(), parseYmd('2026-07-10'))))).not.toContain(gel);
    expect(ids(buildEvening(ctx(1, 1, st(), parseYmd('2026-07-10'))))).toContain(gel);
    expect(ids(buildMorning(ctx(1, 1)))).not.toContain(summer);
  });

  it('the treatment step uses the product of tonight\'s active', () => {
    const t = buildEvening(ctx(1, 2)).find((x) => x.role === 'treatment');
    expect(t).toMatchObject({ id: 'pm_treat', treatment: 'bha', productId: prod('Plain Theory', 'BHA').id, tag: { style: 'bha', label: 'treatment' } });
  });

  it('a removed product disappears; masks, peels and makeup never show', () => {
    const bright = prod('Halden Lab', 'Bright C').id;
    expect(ids(buildMorning(ctx(1, 1)))).toContain(bright);
    const removed = adaRoutine.map((p) => (p.id === bright ? { ...p, status: 'removed' as const } : p));
    expect(ids(buildMorning({ ...ctx(1, 1), products: removed }))).not.toContain(bright);
    const all = [...buildMorning(ctx(20, 1)), ...buildEvening(ctx(20, 1))].map((x) => x.productId);
    for (const [b, n] of [['Norra', 'Exfoliating Peel'], ['Halden Lab', 'Second Skin']]) {
      expect(all).not.toContain(prod(b, n).id);
    }
  });

  it('no product for tonight\'s active → the step stays, without a product', () => {
    const noBha = adaRoutine.filter((p) => p.id !== prod('Plain Theory', 'BHA').id);
    const t = buildEvening({ ...ctx(1, 2), products: noBha }).find((x) => x.role === 'treatment');
    expect(t?.productId).toBeUndefined();
  });

  it('a product with status "active" is used even if it is in the queue (trial passed)', () => {
    const nightId = prod('Norra', 'Rich Repair').id;
    expect(ids(buildEvening(ctx(1, 1)))).not.toContain(nightId);
    const after = adaRoutine.map((p) => (p.id === nightId ? { ...p, status: 'active' as const } : p));
    // Week 1 (still in the reset) but already marked active by hand.
    expect(ids(buildEvening({ ...ctx(1, 1), products: after }))).toContain(nightId);
  });
});

describe('banners', () => {
  const b = (week: number, s = st(), triage: ('T1')[] = []) =>
    computeBanners({ phases, state: s, week, dow: 1, today: addDays(parseYmd(base.start), (week - 1) * 7), triage }).map((x) => x.kind);

  it('not started yet', () => {
    expect(computeBanners({ phases, state: st(), week: 0, dow: 1, today: parseYmd('2026-11-09'), triage: [] }))
      .toEqual([{ kind: 'notStarted', start: '2026-11-16' }]);
  });

  it('asks about the reset after week 6, once', () => {
    expect(b(7)).toContain('resetDecision');
    expect(b(7, st({ resetVerdict: 'better' }))).not.toContain('resetDecision');
  });

  it('asks at the end of each trial until answered', () => {
    const s = st({ resetVerdict: 'better' });
    expect(computeBanners({ phases, state: s, week: 9, dow: 1, today: parseYmd('2027-01-11'), triage: [] }))
      .toContainEqual({ kind: 'trialEnd', trial: 'snail' });
    expect(b(9, st({ resetVerdict: 'better', reintro: { snail: 'ok' } }))).not.toContain('trialEnd');
  });

  it('no triage banner when there are no signals', () => {
    expect(b(2)).not.toContain('triage');
  });
});
