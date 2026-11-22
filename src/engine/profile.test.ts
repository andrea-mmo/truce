import { addDays, buildEvening, buildPhases, computeBanners, computeTips, effectiveSettings, emptyProfile, parseYmd, profileStatus, retinolMode, treatmentFor, triageFromProfile, weekStrip, type Profile } from './index';
import { ADA_QUEUE, adaRoutine } from './fixtures';

const base = { start: '2026-11-16', climb: [2, 6] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[], ret: null, gly: [3, 0] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[] };
const prof = (over: Partial<Profile['triage']> = {}, rest: Partial<Profile> = {}): Profile => ({
  ...emptyProfile(), name: 'Ada', reviewedAt: 1, ...rest, triage: { ...emptyProfile().triage, ...over },
});

describe('profile', () => {
  it('triage signals come from the answers; "prefer not to say" triggers nothing', () => {
    expect(triageFromProfile(prof({ T1: 'yes', T2: 'no', T5: 'yes' }))).toEqual(['T1', 'T5']);
    expect(triageFromProfile(prof({ T4: 'skip' }))).toEqual([]);
    expect(triageFromProfile(prof({ T4: 'yes' }))).toEqual(['T4']);
  });

  it('T3 needs both: jaw/chin breakouts AND hormonal signs', () => {
    expect(triageFromProfile(prof({}, { breakoutAreas: ['jaw'], hormonalSigns: 'no' }))).toEqual([]);
    expect(triageFromProfile(prof({}, { breakoutAreas: ['forehead'], hormonalSigns: 'yes' }))).toEqual([]);
    expect(triageFromProfile(prof({}, { breakoutAreas: ['jaw', 'cheeks'], hormonalSigns: 'yes' }))).toEqual(['T3']);
    // Older profile without the split: the old single answer still counts.
    const legacy = { ...prof({ T3: 'yes' }) } as Profile;
    delete legacy.hormonalSigns;
    delete legacy.breakoutAreas;
    expect(triageFromProfile(legacy)).toEqual(['T3']);
  });

  it('T4: retinol never appears — not in the calendar, not tonight, not by hand', () => {
    const s = effectiveSettings({ ...base, ret: [1, 4] }, prof({ T4: 'yes' }));
    expect(retinolMode(s, 5)).toBe('paused');
    for (let week = 1; week <= 20; week++) {
      for (let d = 0 as 0 | 1 | 2 | 3 | 4 | 5 | 6; d < 7; d = (d + 1) as typeof d) {
        expect(treatmentFor(s, d, week)).not.toBe('ret');
        if (d === 6) break;
      }
      expect(weekStrip(s, addDays(parseYmd(base.start), (week - 1) * 7)).some((x) => x.treatment === 'ret')).toBe(false);
    }
    const phases = buildPhases(ADA_QUEUE);
    const thu = parseYmd('2026-11-19'); // Thursday: retinol night without T4
    const pm = buildEvening({ phases, state: { settings: s, reintro: {}, resetVerdict: null }, week: 1, dow: 4, date: thu, products: adaRoutine });
    expect(pm.find((x) => x.role === 'treatment')?.treatment).toBe('az');
  });

  it('without T4 (or "prefer not to say") the schedule is unchanged', () => {
    expect(treatmentFor(effectiveSettings(base, prof({ T4: 'skip' })), 4, 1)).toBe('ret');
    expect(treatmentFor(effectiveSettings(base, null), 4, 1)).toBe('ret');
  });

  it('profile banner: missing or pending review, after the alarms', () => {
    expect(profileStatus(null)).toBe('missing');
    expect(profileStatus({ ...prof(), reviewedAt: null })).toBe('review');
    const b = computeBanners({ phases: buildPhases([]), state: { settings: base, reintro: {}, resetVerdict: null }, week: 1, dow: 1, today: parseYmd('2026-11-16'), triage: ['T1'], profile: 'review' });
    expect(b.map((x) => x.kind).slice(0, 2)).toEqual(['triage', 'profile']);
  });

  it('R9 after sport on a non-BHA day; C5 with daily makeup', () => {
    const t = computeTips({ phases: buildPhases([]), state: { settings: base, reintro: {}, resetVerdict: null }, week: 1, dow: 3, today: parseYmd('2026-11-18'), logs: [], sportDays: [3], dailyMakeup: true }).map((x) => [x.id, x.ruleId]);
    expect(t).toContainEqual(['afterSport', 'R9']);
    expect(t).toContainEqual(['makeupDoubleCleanse', 'C5']);
    // Climbing day (BHA night) → no extra tip, the banner covers it.
    const t2 = computeTips({ phases: buildPhases([]), state: { settings: base, reintro: {}, resetVerdict: null }, week: 1, dow: 2, today: parseYmd('2026-11-17'), logs: [], sportDays: [2] }).map((x) => x.id);
    expect(t2).not.toContain('afterSport');
  });
});
