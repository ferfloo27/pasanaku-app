import { expect, it } from 'vitest';
import * as fc from 'fast-check';
import { turnDate } from './schedule';

it.each([
  ['2099-12-01', 'monthly', 3, '2100-02-01'],
  ['2096-02-25', 'weekly', 2, '2096-03-03'],
  ['2100-02-25', 'weekly', 2, '2100-03-04'],
  ['2099-12-29', 'biweekly', 2, '2100-01-13'],
  ['2099-01-25', 'biweekly', 2, '2099-02-09'],
])('calcula %s %s posición %s en UTC', (start, frequency, position, expected) => {
  expect(turnDate(start, frequency, position)).toBe(expected);
});
it('propiedad 5: las fechas crecen y cada turno mensual empieza el día 1', () => {
  fc.assert(fc.property(fc.integer({ min: 2026, max: 2200 }), fc.integer({ min: 1, max: 12 }),
    fc.constantFrom('monthly', 'weekly', 'biweekly'), fc.integer({ min: 1, max: 29 }), (year, month, frequency, p) => {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const current = turnDate(start, frequency, p), next = turnDate(start, frequency, p + 1);
      expect(next > current).toBe(true);
      if (frequency === 'monthly') expect(next.slice(-2)).toBe('01');
      else expect((Date.parse(next) - Date.parse(current)) / 86400000).toBe(frequency === 'weekly' ? 7 : 15);
    }));
});
