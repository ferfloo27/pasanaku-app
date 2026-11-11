import { beforeEach, expect, it, vi } from 'vitest';
import { subscribeRoomChannel } from './roomChannel';
const { channel, removeChannel } = vi.hoisted(() => ({ channel: vi.fn(), removeChannel: vi.fn() }));
vi.mock('../../../shared/lib/supabase', () => ({ supabase: { channel, removeChannel } }));
let handlers, status, connection;
beforeEach(() => { vi.clearAllMocks(); handlers = []; connection = { on: vi.fn((kind, filter, callback) => { handlers.push({ filter, callback }); return connection; }), subscribe: vi.fn(callback => { status = callback; return connection; }) }; channel.mockReturnValue(connection); });
it('comparte un solo canal por sala, distribuye eventos y limpia al último consumidor', () => {
  const onRoomUpdated = vi.fn(), onParticipantInserted = vi.fn(), onParticipantDeleted = vi.fn(), onStatus = vi.fn();
  const stop = subscribeRoomChannel('one', { onRoomUpdated, onParticipantInserted, onParticipantDeleted, onStatus });
  const stop2 = subscribeRoomChannel('one', { onRoomUpdated });
  expect(channel).toHaveBeenCalledExactlyOnceWith('room:one');
  expect(handlers).toHaveLength(3);
  handlers.find(h => h.filter.event === 'UPDATE').callback({ new: { id: 'one', status: 'drawn' } });
  expect(onRoomUpdated).toHaveBeenCalledTimes(2);
  handlers.find(h => h.filter.event === 'INSERT').callback({ new: { id: 'p' } });
  expect(onParticipantInserted).toHaveBeenCalledWith({ id: 'p' });
  handlers.find(h => h.filter.event === 'DELETE').callback({ old: { id: 'p' } });
  expect(onParticipantDeleted).toHaveBeenCalledWith({ id: 'p' });
  status('SUBSCRIBED'); expect(onStatus).toHaveBeenCalledWith('SUBSCRIBED');
  stop(); expect(removeChannel).not.toHaveBeenCalled(); stop2(); stop2();
  expect(removeChannel).toHaveBeenCalledExactlyOnceWith(connection);
});
it('no depende de filtros DELETE que PostgreSQL Realtime no aplica', () => {
  const stop = subscribeRoomChannel('two', {});
  expect(handlers.find(h => h.filter.event === 'DELETE').filter).toEqual({ event: 'DELETE', schema: 'public', table: 'participants' });
  expect(handlers.find(h => h.filter.event === 'INSERT').filter.filter).toBe('room_id=eq.two');
  stop();
});
