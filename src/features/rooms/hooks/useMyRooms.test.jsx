import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useMyRooms } from './useMyRooms';
import { AuthContext } from '../../../app/authContext';
import { AppError } from '../../../shared/errors/appError';
const { listMyRooms } = vi.hoisted(() => ({ listMyRooms: vi.fn() }));
vi.mock('../api/roomsApi', () => ({ listMyRooms }));
const wrapper = ({ children }) => <AuthContext.Provider value={{ user: { id: 'user' } }}>{children}</AuthContext.Provider>;
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); });
it('separa canceladas y conserva la lista de la base de datos', async () => {
  const cancelled = { id: 'cancelled-one', status: 'cancelled', name: 'Amigas', host_name: 'Rosa' };
  const room = { id: 'active', status: 'waiting' };
  listMyRooms.mockResolvedValue({ data: [cancelled, room] });
  const { result, unmount } = renderHook(() => useMyRooms(), { wrapper });
  expect(result.current.status).toBe('loading');
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(result.current.rooms).toEqual([room]);
  expect(result.current.notices).toEqual([cancelled]);
  act(() => result.current.dismissNotice(cancelled.id));
  expect(result.current.notices).toEqual([]);
  unmount();
  const again = renderHook(() => useMyRooms(), { wrapper });
  await waitFor(() => expect(again.result.current.status).toBe('ready'));
  expect(again.result.current.notices).toEqual([]);
});
it('un aviso ya mostrado no reaparece aunque no se haya cerrado', async () => {
  listMyRooms.mockResolvedValue({ data: [{ id: 'cancelled-twice', status: 'cancelled' }] });
  const first = renderHook(() => useMyRooms(), { wrapper });
  await waitFor(() => expect(first.result.current.notices).toHaveLength(1));
  first.unmount();
  const second = renderHook(() => useMyRooms(), { wrapper });
  await waitFor(() => expect(second.result.current.status).toBe('ready'));
  expect(second.result.current.notices).toEqual([]);
});
it('permite reintentar sin almacenar las salas en el dispositivo', async () => {
  listMyRooms.mockRejectedValueOnce(new AppError('NETWORK')).mockResolvedValueOnce({ data: [{ id: 'fresh', status: 'drawn' }] });
  const { result } = renderHook(() => useMyRooms(), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('error'));
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.rooms).toEqual([{ id: 'fresh', status: 'drawn' }]));
  expect(localStorage.length).toBe(0);
});
it('ignora una carga pendiente después de desmontar', async () => {
  let resolve;
  listMyRooms.mockImplementation(() => new Promise(done => { resolve = done; }));
  const first = renderHook(() => useMyRooms(), { wrapper });
  first.unmount();
  await act(async () => resolve({ data: [{ id: 'not-shown', status: 'cancelled' }] }));
  expect(localStorage.length).toBe(0);
});
it('no bloquea cargar y cerrar avisos si localStorage está bloqueado', async () => {
  const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  listMyRooms.mockResolvedValue({ data: [{ id: 'blocked-storage', status: 'cancelled' }] });
  try {
    const { result } = renderHook(() => useMyRooms(), { wrapper });
    await waitFor(() => expect(result.current.notices).toHaveLength(1));
    act(() => result.current.dismissNotice('blocked-storage'));
    expect(result.current.notices).toEqual([]);
  } finally { get.mockRestore(); set.mockRestore(); }
});
