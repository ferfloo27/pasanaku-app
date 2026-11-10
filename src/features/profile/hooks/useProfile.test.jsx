import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useProfileState } from './useProfileState';
import { AppError } from '../../../shared/errors/appError';
const { api } = vi.hoisted(() => ({ api: { getProfile: vi.fn(), saveDisplayName: vi.fn() } }));
vi.mock('../api/profileApi', () => api);
beforeEach(() => vi.resetAllMocks());
it('distingue perfil ausente, guarda y actualiza el nombre compartido', async () => {
  api.getProfile.mockResolvedValue({ data: null });
  api.saveDisplayName.mockResolvedValue({ data: { user_id: 'one', display_name: 'Lucía' } });
  const { result } = renderHook(() => useProfileState({ id: 'one' }));
  expect(result.current.status).toBe('loading');
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.profile).toBeNull();
  await act(() => result.current.save('Lucía'));
  expect(result.current.profile.display_name).toBe('Lucía');
});
it('permite reintentar cargar y conserva el perfil cuando falla guardar', async () => {
  api.getProfile.mockRejectedValueOnce(new AppError('PROFILE_LOAD_FAILED'))
    .mockResolvedValueOnce({ data: { user_id: 'one', display_name: 'Rosa' } });
  api.saveDisplayName.mockRejectedValue(new AppError('PROFILE_SAVE_FAILED'));
  const { result } = renderHook(() => useProfileState({ id: 'one' }));
  await waitFor(() => expect(result.current.status).toBe('error'));
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await act(async () => { await expect(result.current.save('Juan')).rejects.toMatchObject({ code: 'PROFILE_SAVE_FAILED' }); });
  expect(result.current.profile.display_name).toBe('Rosa');
  expect(result.current.isSaving).toBe(false);
});
it('descarta respuestas del usuario anterior y no recarga al vincular el mismo uid', async () => {
  let oldResolve;
  api.getProfile.mockImplementationOnce(() => new Promise(r => { oldResolve = r; }))
    .mockResolvedValue({ data: { user_id: 'two', display_name: 'Juan' } });
  const { result, rerender } = renderHook(({ user }) => useProfileState(user), { initialProps: { user: { id: 'one' } } });
  rerender({ user: { id: 'two' } });
  expect(result.current.profile).toBeNull();
  await waitFor(() => expect(result.current.profile?.display_name).toBe('Juan'));
  await act(async () => oldResolve({ data: { user_id: 'one', display_name: 'Rosa' } }));
  rerender({ user: { id: 'two', is_anonymous: false } });
  expect(result.current.profile.display_name).toBe('Juan');
  expect(api.getProfile).toHaveBeenCalledTimes(2);
});
it('rechaza guardar durante la carga sin invalidar la lectura pendiente', async () => {
  let resolve; api.getProfile.mockImplementation(() => new Promise(r => { resolve = r; }));
  const { result } = renderHook(() => useProfileState({ id: 'one' }));
  await act(async () => { await expect(result.current.save('Rosa')).rejects.toMatchObject({ code: 'PROFILE_REQUIRED' }); });
  expect(api.saveDisplayName).not.toHaveBeenCalled();
  await act(async () => resolve({ data: { user_id: 'one', display_name: 'Lucía' } }));
  expect(result.current.profile.display_name).toBe('Lucía');
});
