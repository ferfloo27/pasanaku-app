import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useDraft } from './useDraft';
const room = { start_date: '2099-01-01', frequency: 'monthly' };
const participants = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bea' }];
it('conserva el borrador privado ante altas y lo regenera con la lista actual', () => {
  const { result, rerender, unmount } = renderHook(({ people }) => useDraft(people, room, () => .999), { initialProps: { people: participants } });
  act(() => result.current.move(1, 0));
  expect(result.current.draft[0].participantId).toBe('b');
  rerender({ people: [...participants, { id: 'c', name: 'Carmen' }] });
  expect(result.current.participantsChanged).toBe(true);
  expect(result.current.draft).toHaveLength(2);
  act(() => result.current.reshuffle());
  expect(result.current.participantsChanged).toBe(false);
  expect(result.current.draft).toHaveLength(3);
  unmount();
  const fresh = renderHook(() => useDraft(participants, room, () => .999));
  expect(fresh.result.current.draft[0].participantId).toBe('a');
});
