import { beforeEach, expect, it, vi } from 'vitest';
import { getProfile, saveDisplayName } from './profileApi';
const { client, query } = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), upsert: vi.fn(), single: vi.fn() };
  return { client: { from: vi.fn() }, query };
});
vi.mock('../../../shared/lib/supabase', () => ({ supabase: client }));
beforeEach(() => {
  vi.resetAllMocks(); client.from.mockReturnValue(query);
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.upsert.mockReturnValue(query);
});
it('consulta solo el perfil del usuario y distingue la ausencia de un fallo', async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect(await getProfile('one')).toEqual({ data: null });
  expect(client.from).toHaveBeenCalledWith('profiles');
  expect(query.eq).toHaveBeenCalledWith('user_id', 'one');
  query.maybeSingle.mockResolvedValue({ error: { message: 'database' } });
  await expect(getProfile('one')).rejects.toMatchObject({ code: 'PROFILE_LOAD_FAILED' });
});
it('guarda solo el nombre propio normalizado, sin tocar participaciones', async () => {
  query.single.mockResolvedValue({ data: { user_id: 'one', display_name: 'Lucía' }, error: null });
  expect(await saveDisplayName('one', '  Lucía ')).toEqual({ data: { user_id: 'one', display_name: 'Lucía' } });
  expect(query.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'one', display_name: 'Lucía' }), { onConflict: 'user_id' });
  expect(client.from.mock.calls).toEqual([['profiles']]);
});
it('no envía nombres inválidos ni escribe sin identidad', async () => {
  await expect(saveDisplayName('one', ' ')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  await expect(saveDisplayName(null, 'Lucía')).rejects.toMatchObject({ code: 'AUTH_FAILED' });
  expect(client.from).not.toHaveBeenCalled();
});
it('convierte un fallo de guardado a AppError', async () => {
  query.single.mockRejectedValue(new Error('network'));
  await expect(saveDisplayName('one', 'Lucía')).rejects.toMatchObject({ code: 'PROFILE_SAVE_FAILED' });
});
