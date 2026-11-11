import { expect, it } from 'vitest';
import * as fc from 'fast-check';
import { buildDraft, moveDraftItem, draftToOrder } from './draft';
import { turnDate } from './schedule';
const room = { start_date: '2099-12-01', frequency: 'monthly' };
const people = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bea' }, { id: 'c', name: 'Carmen' }];
it('genera el orden privado y recalcula fechas al mover sin mutar', () => {
  const draft = buildDraft(people, room, () => 0.999);
  expect(draft).toEqual([
    { participantId: 'a', name: 'Ana', position: 1, turnDate: '2099-12-01' },
    { participantId: 'b', name: 'Bea', position: 2, turnDate: '2100-01-01' },
    { participantId: 'c', name: 'Carmen', position: 3, turnDate: '2100-02-01' },
  ]);
  const moved = moveDraftItem(draft, 2, 0, room);
  expect(draftToOrder(moved)).toEqual(['c', 'a', 'b']);
  expect(moved[0]).toMatchObject({ name: 'Carmen', position: 1, turnDate: '2099-12-01' });
  expect(moved[1].turnDate).toBe('2100-01-01');
  expect(draftToOrder(draft)).toEqual(['a', 'b', 'c']);
  expect(people.map(p => p.id)).toEqual(['a', 'b', 'c']);
});
it('propiedades 3 y 4: generar y mover preservan participantes, posiciones y calendario', () => {
  fc.assert(fc.property(fc.integer({ min: 2, max: 30 }), fc.nat(), fc.nat(), fc.constantFrom('monthly', 'weekly', 'biweekly'), (count, from, to, frequency) => {
    const participants = Array.from({ length: count }, (_, i) => Object.freeze({ id: `p${i}`, name: `Persona ${i}` }));
    const config = { ...room, frequency };
    const initial = buildDraft(Object.freeze(participants), config, () => 0.4);
    const moved = moveDraftItem(Object.freeze(initial), from % count, to % count, config);
    for (const draft of [initial, moved]) {
      expect([...draftToOrder(draft)].sort()).toEqual(participants.map(p => p.id).sort());
      expect(draft.map(row => row.position)).toEqual(Array.from({ length: count }, (_, i) => i + 1));
      draft.forEach((row, i) => expect(row.turnDate).toBe(turnDate(config.start_date, frequency, i + 1)));
    }
  }));
});
