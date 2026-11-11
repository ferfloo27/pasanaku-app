import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { payoutPerTurn, validateRoomForm } from './roomForm';

const today = '2026-11-10';
const valid = {
  name: 'Familia Mamani', contributionBs: 200, frequency: 'monthly',
  startDate: '2026-11', maxParticipants: 30,
};
const validate = (changes = {}, day = today) => validateRoomForm({ ...valid, ...changes }, day);

describe('validateRoomForm', () => {
  it('acepta el mes actual, enteros límite y strings de dígitos del formulario sin mutarlos', () => {
    expect(validate()).toEqual({ ok: true, errors: {} });
    expect(validate({ name: `  ${'🦙'.repeat(60)}  `, contributionBs: '1', maxParticipants: '2' }).ok).toBe(true);
    expect(validate({ contributionBs: '100000', maxParticipants: '30' }).ok).toBe(true);
    const values = Object.freeze({ ...valid });
    expect(validateRoomForm(values, today)).toEqual({ ok: true, errors: {} });
  });

  it('devuelve todos los errores por campo', () => {
    expect(validate({ name: ' ', contributionBs: 0, frequency: 'daily', startDate: '', maxParticipants: 31 }))
      .toEqual({ ok: false, errors: {
        name: 'INVALID_INPUT', contributionBs: 'INVALID_INPUT', frequency: 'INVALID_INPUT',
        startDate: 'INVALID_INPUT', maxParticipants: 'INVALID_INPUT',
      } });
  });

  it.each([null, undefined, true, {}, 12])('rechaza un nombre no textual: %s', name => {
    expect(validate({ name }).errors.name).toBe('INVALID_INPUT');
  });

  it('propiedad 7: acepta exactamente 1–60 caracteres Unicode del nombre tras trim', () => {
    fc.assert(fc.property(fc.oneof(fc.string(), fc.integer({ min: 0, max: 100 }).map(n => '🦙'.repeat(n))), name => {
      const length = Array.from(name.trim()).length;
      expect(validate({ name }).ok).toBe(length >= 1 && length <= 60);
    }));
  });

  it('propiedad 7: acepta exactamente cuotas y máximos enteros dentro de sus límites', () => {
    fc.assert(fc.property(fc.integer({ min: -100000, max: 200000 }), fc.integer({ min: -100, max: 100 }), (contributionBs, maxParticipants) => {
      const expected = contributionBs >= 1 && contributionBs <= 100000 && maxParticipants >= 2 && maxParticipants <= 30;
      expect(validate({ contributionBs, maxParticipants }).ok).toBe(expected);
      expect(validate({ contributionBs: String(contributionBs), maxParticipants: String(maxParticipants) }).ok).toBe(expected);
    }));
  });

  it.each(['', ' ', '1.0', '2.5', '1e2', '+2', ' 2', '2 ', '0x10', '２', true, false, null, undefined, [], {}, NaN, Infinity, 2.5])('no convierte valores numéricos malformados: %s', value => {
      expect(validate({ contributionBs: value }).errors.contributionBs).toBe('INVALID_INPUT');
      expect(validate({ maxParticipants: value }).errors.maxParticipants).toBe('INVALID_INPUT');
    });

  it.each(['weekly', 'biweekly'])('acepta hoy y rechaza ayer para %s', frequency => {
    expect(validate({ frequency, startDate: '2026-11-10' }).ok).toBe(true);
    expect(validate({ frequency, startDate: '2026-11-09' }).errors.startDate).toBe('INVALID_INPUT');
    expect(validate({ frequency, startDate: '2026-11' }).errors.startDate).toBe('INVALID_INPUT');
  });

  it.each(['2026-00', '2026-13', '2026-1', '2026-11-01', '', null, true, '0000-11'])('rechaza meses inválidos o que no siguen YYYY-MM: %s', startDate => {
      expect(validate({ startDate }).errors.startDate).toBe('INVALID_INPUT');
    });

  it.each(['2027-02-29', '2100-02-29', '2026-11-31', '2026-13-01', '2026-00-01', '2026-12-00', '2026-12-32', '2026-1-12', '2026-12-01T00:00:00Z', null, 20261201, '0000-12-01'])('rechaza días inexistentes o que no siguen YYYY-MM-DD: %s', startDate => {
      expect(validate({ frequency: 'weekly', startDate }).errors.startDate).toBe('INVALID_INPUT');
    });

  it('acepta un día bisiesto real y cruces de año sin depender de la zona local', () => {
    expect(validate({ frequency: 'biweekly', startDate: '2028-02-29' }).ok).toBe(true);
    expect(validate({ startDate: '2027-01' }, '2026-12-31').ok).toBe(true);
    expect(validate({ startDate: '2026-12' }, '2027-01-01').ok).toBe(false);
  });

  it('propiedad 7: rechaza días pasados y acepta hoy o días futuros para ambas frecuencias', () => {
    fc.assert(fc.property(fc.integer({ min: -1500, max: 1500 }), fc.constantFrom('weekly', 'biweekly'), (offset, frequency) => {
      const startDate = new Date(Date.UTC(2026, 10, 10 + offset)).toISOString().slice(0, 10);
      expect(validate({ frequency, startDate }).ok).toBe(offset >= 0);
    }));
  });

  it('propiedad 7: compara meses, admitiendo todo el mes actual aunque haya comenzado', () => {
    fc.assert(fc.property(fc.integer({ min: -100, max: 100 }), offset => {
      const startDate = new Date(Date.UTC(2026, 10 + offset, 1)).toISOString().slice(0, 7);
      expect(validate({ startDate }).ok).toBe(offset >= 0);
    }));
  });
});

it('payoutPerTurn calcula el pozo de ejemplo y el máximo admitido', () => {
  expect(payoutPerTurn(200, 8)).toBe(1600);
  expect(payoutPerTurn(100000, 30)).toBe(3000000);
  fc.assert(fc.property(fc.integer({ min: 1, max: 100000 }), fc.integer({ min: 2, max: 30 }), (quota, n) => {
    expect(payoutPerTurn(quota, n + 1) - payoutPerTurn(quota, n)).toBe(quota);
  }));
});
