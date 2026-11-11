import { expect, it } from 'vitest';
import * as fc from 'fast-check';
import { resultRows } from './results';
it('ordena por posición y une por participación aunque haya nombres repetidos', () => {
  const turns = Object.freeze([{ participant_id: 'b', position: 2, turn_date: '2027-02-01', payout_bs: 1600 }, { participant_id: 'a', position: 1, turn_date: '2027-01-01', payout_bs: 1600 }]);
  const people = [{ id: 'a', user_id: 'other', name: 'Ana' }, { id: 'b', user_id: 'me', name: 'Ana' }];
  const rows = resultRows(turns, people);
  expect(rows.map(row => row.user_id)).toEqual(['other', 'me']);
  expect(rows[1]).toMatchObject({ name: 'Ana', turn_date: '2027-02-01', payout_bs: 1600 });
  expect(turns[0].position).toBe(2);
});
it('preserva todos los turnos y sus montos y asocia cada identidad correcta', () => {
  fc.assert(fc.property(fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 30 }), ids => {
    const people = ids.map((id, i) => ({ id, user_id: `u${i}`, name: `Persona ${i}` }));
    const turns = ids.map((id, i) => ({ participant_id: id, position: i + 1, payout_bs: 100 + i })).reverse();
    const rows = resultRows(Object.freeze(turns), Object.freeze(people));
    expect(rows.map(row => row.participant_id)).toEqual(ids);
    rows.forEach((row, i) => { expect(row.user_id).toBe(`u${i}`); expect(row.payout_bs).toBe(100 + i); });
  }));
});
