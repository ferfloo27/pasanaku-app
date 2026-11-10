import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatMoney } from './money';
import { formatTurnDate } from './dates';

describe('Propiedad 6: formatos de presentación', () => {
  it.each([[0, 'Bs 0'], [200, 'Bs 200'], [1600, 'Bs 1.600'], [100000, 'Bs 100.000'], [3000000, 'Bs 3.000.000']])('formatea %s como %s', (amount, expected) => {
    expect(formatMoney(amount)).toBe(expected);
  });
  it('conserva todo monto entero con agrupación de tres dígitos', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 3000000 }), amount => {
      const formatted = formatMoney(amount);
      expect(formatted).toMatch(/^Bs (?:0|[1-9]\d{0,2}(?:\.\d{3})*)$/);
      expect(Number(formatted.slice(3).replaceAll('.', ''))).toBe(amount);
    }));
  });
  it.each([
    ['2027-01-01', 'monthly', 'Enero 2027'], ['2027-01-15', 'weekly', '15 ene 2027'],
    ['2028-02-29', 'biweekly', '29 feb 2028'], ['2027-12-31', 'weekly', '31 dic 2027'],
  ])('formatea %s (%s) en español', (date, frequency, expected) => {
    expect(formatTurnDate(date, frequency)).toBe(expected);
  });
  it('conserva día y año para cualquier fecha válida, sin desplazamiento horario', () => {
    fc.assert(fc.property(fc.integer({ min: 1900, max: 2100 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }), (year, month, day) => {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const formatted = formatTurnDate(date, 'biweekly');
      expect(formatted.split(' ')[0]).toBe(String(day));
      expect(formatted.split(' ')[2]).toBe(String(year));
      expect(formatted.split(' ')[1]).toMatch(/^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)$/);
      expect(formatTurnDate(date, 'monthly')).toMatch(new RegExp(`^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ ${year}$`));
    }));
  });
  it('rechaza montos y fechas inválidos sin mostrar formatos engañosos', () => {
    expect(() => formatMoney(1.5)).toThrow(RangeError);
    expect(() => formatMoney(NaN)).toThrow(RangeError);
    expect(() => formatTurnDate('2027-02-30', 'weekly')).toThrow(RangeError);
    expect(() => formatTurnDate('2027-01-01', 'daily')).toThrow(RangeError);
  });
});
