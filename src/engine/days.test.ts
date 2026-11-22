import { clampOffset, computeBanners, buildPhases, dateForOffset, offsetFor, parseYmd, toYmd } from './index';

const today = parseYmd('2026-11-21');

describe('day navigation', () => {
  it('never goes to the future nor more than 7 days back', () => {
    expect(clampOffset(1)).toBe(0);
    expect(clampOffset(-3)).toBe(-3);
    expect(clampOffset(-30)).toBe(-7);
  });

  it('dateForOffset', () => {
    expect(toYmd(dateForOffset(today, -1))).toBe('2026-11-20');
    expect(toYmd(dateForOffset(today, -99))).toBe('2026-11-14');
  });

  it('offsetFor tells which days can be opened', () => {
    expect(offsetFor(today, parseYmd('2026-11-21'))).toBe(0);
    expect(offsetFor(today, parseYmd('2026-11-18'))).toBe(-3);
    expect(offsetFor(today, parseYmd('2026-11-22'))).toBeNull();
    expect(offsetFor(today, parseYmd('2026-11-13'))).toBeNull();
  });

  it('on a past day: triage still first, then the reminder, nothing else', () => {
    const banners = computeBanners({
      phases: buildPhases(['snail']),
      state: { settings: { start: '2026-11-16', climb: [2, 6], ret: null, gly: [] }, reintro: {}, resetVerdict: null },
      week: 1, dow: 2, today: parseYmd('2026-11-17'), triage: ['T1'], viewingPast: true,
    });
    expect(banners).toEqual([{ kind: 'triage', signals: ['T1'] }, { kind: 'pastDay' }]);
  });
});
