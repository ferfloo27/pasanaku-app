import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatMonth } from './dates';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

describe('formatMonth', () => {
  it('formats January correctly', () => {
    expect(formatMonth('2026-01-01')).toBe('Enero 2026');
  });

  it('formats December correctly', () => {
    expect(formatMonth('2025-12-01')).toBe('Diciembre 2025');
  });

  it('works with YYYY-MM format (no day)', () => {
    expect(formatMonth('2026-06')).toBe('Junio 2026');
  });

  it('formats all 12 months correctly', () => {
    const expected = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    for (let m = 1; m <= 12; m++) {
      const padded = String(m).padStart(2, '0');
      expect(formatMonth(`2024-${padded}-01`)).toBe(`${expected[m - 1]} 2024`);
    }
  });
});

/**
 * Property 9: Formato de mes en español
 * Validates: Requirements 8.4
 */
describe('formatMonth — Property 9: Formato de mes en español', () => {
  it('returns "<NombreMesEspañol> <YYYY>" for any valid year and month', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1900, max: 2100 }),
        fc.integer({ min: 1, max: 12 }),
        (year, month) => {
          const dateStr = `${year}-${String(month).padStart(2, '0')}`;
          const result = formatMonth(dateStr);
          const expected = `${MONTHS_ES[month - 1]} ${year}`;
          expect(result).toBe(expected);
        }
      )
    );
  });
});
