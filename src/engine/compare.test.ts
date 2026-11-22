import { daysApart, defaultComparison, sortPhotos } from './index';

const p = (id: number, date: string, createdAt = id) => ({ id, date, createdAt });

describe('photo comparison', () => {
  it('needs at least two photos', () => {
    expect(defaultComparison([])).toBeNull();
    expect(defaultComparison([p(1, '2026-11-21')])).toBeNull();
  });

  it('first vs latest, whatever the insertion order', () => {
    const c = defaultComparison([p(3, '2027-01-10'), p(1, '2026-11-21'), p(2, '2026-12-05')]);
    expect(c?.before.id).toBe(1);
    expect(c?.after.id).toBe(3);
  });

  it('same day: ordered by time taken', () => {
    expect(sortPhotos([p(2, '2026-11-21', 20), p(1, '2026-11-21', 10)]).map((x) => x.id)).toEqual([1, 2]);
  });

  it('days apart', () => {
    expect(daysApart(p(1, '2026-11-21'), p(2, '2027-01-10'))).toBe(50);
    expect(daysApart(p(2, '2027-01-10'), p(1, '2026-11-21'))).toBe(50);
  });
});
