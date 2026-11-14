import { beforeEach, expect, it, vi } from 'vitest';
import { hasRoomMembership } from './membershipApi';
const { from, query } = vi.hoisted(() => ({ from: vi.fn(), query: { select: vi.fn(), eq: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn() } }));
vi.mock('../../../shared/lib/supabase', () => ({ supabase: { from } }));
beforeEach(() => {
  vi.resetAllMocks(); from.mockReturnValue(query);
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.limit.mockReturnValue(query);
});
it.each([['una participación incluso cancelada antigua', { id: 'old-membership' }, true], ['ninguna participación', null, false]])('detecta %s sin filtrar por estado ni fecha', async (_, data, expected) => {
  query.maybeSingle.mockResolvedValue({ data, error: null });
  expect(await hasRoomMembership('guest')).toBe(expected);
  expect(from).toHaveBeenCalledWith('participants');
  expect(query.eq).toHaveBeenCalledExactlyOnceWith('user_id', 'guest');
  expect(query.limit).toHaveBeenCalledWith(1);
});
it('falla de forma segura cuando no se puede verificar la participación', async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: new Error('offline') });
  await expect(hasRoomMembership('guest')).rejects.toMatchObject({ code: 'NETWORK' });
});
