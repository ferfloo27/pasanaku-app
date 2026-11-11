import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useRoomSession } from './useRoomSession';
import { AuthContext } from '../../../app/authContext';
import { AppError } from '../../../shared/errors/appError';
const { loadRoomSession, subscribeRoomChannel, joinRoom } = vi.hoisted(() => ({ loadRoomSession: vi.fn(), subscribeRoomChannel: vi.fn(), joinRoom: vi.fn() }));
vi.mock('../api/roomSessionApi', () => ({ loadRoomSession }));
vi.mock('../api/roomChannel', () => ({ subscribeRoomChannel }));
vi.mock('../api/previewApi', () => ({ joinRoom }));
const room = { id: 'r', code: 'ABC123', status: 'waiting', host_name: 'Rosa' };
const participants = [{ id: 'own', room_id: 'r', user_id: 'u', name: 'Lucía' }];
const member = (changes = {}) => ({ data: { room, participants, turns: [], isMember: true, ...changes } });
const preview = () => member({ room: { ...room, is_member: false }, participants: [], isMember: false });
const wrapper = ({ children }) => <AuthContext.Provider value={{ user: { id: 'u' } }}>{children}</AuthContext.Provider>;
let handlers, cleanup;
beforeEach(() => { vi.resetAllMocks(); handlers = null; cleanup = vi.fn(); subscribeRoomChannel.mockImplementation((_, callbacks) => { handlers = callbacks; return cleanup; }); loadRoomSession.mockResolvedValue(member()); });
it('carga un miembro, crea un canal y recarga al suscribirse para cerrar el hueco inicial', async () => {
  const { result, unmount } = renderHook(() => useRoomSession('ABC123'), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('lobby'));
  expect(subscribeRoomChannel).toHaveBeenCalledTimes(1);
  loadRoomSession.mockResolvedValue(member({ participants: [...participants, { id: 'new', user_id: 'v' }] }));
  await act(async () => handlers.onStatus('SUBSCRIBED'));
  await waitFor(() => expect(result.current.participants).toHaveLength(2));
  expect(result.current.channelStatus).toBe('SUBSCRIBED');
  unmount(); expect(cleanup).toHaveBeenCalledOnce();
});
it('carga drawn como results y un UPDATE vivo como revealing con turnos recargados', async () => {
  const { result } = renderHook(() => useRoomSession('ABC123'), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('lobby'));
  const drawn = { ...room, status: 'drawn' }; loadRoomSession.mockResolvedValue(member({ room: drawn, turns: [{ id: 't' }] }));
  await act(async () => handlers.onRoomUpdated(drawn));
  await waitFor(() => expect(result.current.turns).toHaveLength(1));
  expect(result.current.status).toBe('revealing');
});
it('confirma PK-only DELETE y pérdida de membresía con el servidor', async () => {
  const { result } = renderHook(() => useRoomSession('ABC123'), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('lobby'));
  loadRoomSession.mockResolvedValue(preview());
  await act(async () => handlers.onParticipantDeleted({ id: 'own' }));
  await waitFor(() => expect(result.current.status).toBe('removed'));
  expect(result.current.room.host_name).toBe('Rosa');
  expect(loadRoomSession).toHaveBeenCalledTimes(2);
});
it('una pre-unión no abre canal, join bloquea duplicados y carga el lobby', async () => {
  loadRoomSession.mockResolvedValueOnce(preview());
  let finish; joinRoom.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { result } = renderHook(() => useRoomSession('ABC123'), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('preview'));
  expect(subscribeRoomChannel).not.toHaveBeenCalled();
  let promise; act(() => { promise = result.current.join(); result.current.join(); });
  expect(result.current.joining).toBe(true); expect(joinRoom).toHaveBeenCalledExactlyOnceWith('ABC123');
  await act(async () => { finish({ data: room }); await promise; });
  expect(result.current.status).toBe('lobby');
});
it('conserva la pre-unión y muestra error de cupo al fallar join', async () => {
  loadRoomSession.mockResolvedValue(preview()); joinRoom.mockRejectedValue(new AppError('ROOM_FULL'));
  const { result } = renderHook(() => useRoomSession('ABC123'), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('preview'));
  await act(async () => result.current.join());
  expect(result.current.status).toBe('preview'); expect(result.current.error.code).toBe('ROOM_FULL');
});
it('ignora respuestas tardías de otra ruta y limpia el canal anterior', async () => {
  let finish; loadRoomSession.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const { result, rerender } = renderHook(({ code }) => useRoomSession(code), { initialProps: { code: 'ABC123' }, wrapper });
  rerender({ code: 'DEF456' });
  await waitFor(() => expect(result.current.status).toBe('lobby'));
  await act(async () => finish(preview()));
  expect(result.current.status).toBe('lobby');
});
it('no sobrescribe eventos recibidos durante una carga y resincroniza DELETE ajeno sin expulsar al usuario', async () => {
  const { result } = renderHook(() => useRoomSession('ABC123'), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('lobby'));
  let finish; loadRoomSession.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  act(() => { result.current.refresh(); });
  act(() => handlers.onParticipantInserted({ id: 'new', room_id: 'r', user_id: 'v' }));
  loadRoomSession.mockResolvedValue(member({ participants: [...participants, { id: 'new', room_id: 'r', user_id: 'v' }] }));
  await act(async () => finish(member()));
  await waitFor(() => expect(result.current.participants).toHaveLength(2));
  loadRoomSession.mockResolvedValue(member());
  await act(async () => handlers.onParticipantDeleted({ id: 'some-global-id' }));
  expect(result.current.status).toBe('lobby'); expect(result.current.participants).toHaveLength(1);
});
it('borra el destaque de un participante nuevo después de un plazo breve', async () => {
  const { result } = renderHook(() => useRoomSession('ABC123'), { wrapper });
  await waitFor(() => expect(result.current.status).toBe('lobby'));
  vi.useFakeTimers();
  try {
    act(() => handlers.onParticipantInserted({ id: 'highlight', room_id: 'r', user_id: 'v' }));
    expect(result.current.newParticipantIds).toEqual(['highlight']);
    act(() => vi.advanceTimersByTime(3500));
    expect(result.current.newParticipantIds).toEqual([]);
  } finally { vi.useRealTimers(); }
});
it('reintenta errores iniciales, resincroniza reconexión y vuelve a detectar cancelación', async () => {
  loadRoomSession.mockRejectedValueOnce(new AppError('NETWORK'));
  const { result } = renderHook(() => useRoomSession('ABC123'), { wrapper });
  await waitFor(() => expect(result.current.error?.code).toBe('NETWORK'));
  await act(async () => result.current.retry());
  expect(result.current.status).toBe('lobby');
  act(() => handlers.onStatus('CHANNEL_ERROR'));
  expect(result.current.channelStatus).toBe('CHANNEL_ERROR');
  loadRoomSession.mockResolvedValue(member({ room: { ...room, status: 'cancelled' } }));
  await act(async () => handlers.onStatus('SUBSCRIBED'));
  expect(result.current.status).toBe('cancelled');
  expect(result.current.room.host_name).toBe('Rosa');
});
it('drawn al entrar no revela y el código inexistente usa not_found', async () => {
  loadRoomSession.mockResolvedValueOnce(member({ room: { ...room, status: 'drawn' } }));
  const first = renderHook(() => useRoomSession('ABC123'), { wrapper });
  await waitFor(() => expect(first.result.current.status).toBe('results'));
  first.unmount();
  loadRoomSession.mockRejectedValueOnce(new AppError('ROOM_NOT_FOUND'));
  const missing = renderHook(() => useRoomSession('ZZZZZZ'), { wrapper });
  await waitFor(() => expect(missing.result.current.status).toBe('not_found'));
});
it('una confirmación local invalida cargas anteriores para no restaurar participantes eliminados', async () => {
  const other = { id: 'other', room_id: 'r', user_id: 'v' };
  loadRoomSession.mockResolvedValue(member({ participants: [...participants, other] }));
  const { result } = renderHook(() => useRoomSession('ABC123'), { wrapper });
  await waitFor(() => expect(result.current.participants).toHaveLength(2));
  let finish; loadRoomSession.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  act(() => { result.current.refresh(); });
  act(() => result.current.dispatch({ type: 'PARTICIPANT_DELETED', participantId: 'other' }));
  loadRoomSession.mockResolvedValue(member());
  await act(async () => finish(member({ participants: [...participants, other] })));
  await waitFor(() => expect(result.current.participants).toHaveLength(1));
});
it('descarta callbacks de gestión capturados en una ruta anterior', async () => {
  const { result, rerender } = renderHook(({ code }) => useRoomSession(code), { initialProps: { code: 'ABC123' }, wrapper });
  await waitFor(() => expect(result.current.status).toBe('lobby'));
  const oldDispatch = result.current.dispatch;
  rerender({ code: 'DEF456' });
  await waitFor(() => expect(result.current.status).toBe('lobby'));
  act(() => oldDispatch({ type: 'CANCELLED' }));
  expect(result.current.status).toBe('lobby');
});
