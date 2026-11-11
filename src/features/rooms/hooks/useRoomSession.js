import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { loadRoomSession } from '../api/roomSessionApi';
import { joinRoom } from '../api/previewApi';
import { subscribeRoomChannel } from '../api/roomChannel';
import { initialRoomState, roomReducer } from '../domain/roomMachine';
import { useOnline } from './useOnline';

function scopedReducer(state, action) {
  const current = state.scope === action.scope ? state : { ...initialRoomState, scope: action.scope };
  return { ...roomReducer(current, action), scope: action.scope };
}
/** Una sesión por código/cuenta. refresh coalesce lecturas y descarta snapshots
 * anteriores a eventos; SUBSCRIBED fuerza recarga para cerrar el hueco inicial.
 * dispatch permite transiciones locales tras RPC confirmadas por la UI. */
export function useRoomSession(code) {
  const isOnline = useOnline();
  const { user } = useAuth();
  const userId = user?.id;
  const scope = `${userId || ''}:${code}`;
  const [state, rawDispatch] = useReducer(scopedReducer, { ...initialRoomState, scope });
  const [meta, setMeta] = useState({ scope, joining: false, channelStatus: 'CONNECTING', refreshing: false });
  const runtime = useRef(null);
  useEffect(() => {
    let active = true;
    let firstLoad = true;
    let revision = 0;
    let dirty = false;
    let pending = null;
    let joinPending = null;
    let roomId = null;
    let stopChannel = null;
    const highlightTimers = new Set();
    const send = action => { if (active) rawDispatch({ ...action, scope }); };
    const updateMeta = change => { if (active) setMeta(previous => ({ ...(previous.scope === scope ? previous : { joining: false, channelStatus: 'CONNECTING' }), ...change, scope })); };
    const connect = data => {
      const nextId = data.isMember && data.room.status !== 'cancelled' ? data.room.id : null;
      if (roomId === nextId) return;
      stopChannel?.(); stopChannel = null; roomId = nextId;
      if (!nextId) { updateMeta({ channelStatus: 'CLOSED' }); return; }
      updateMeta({ channelStatus: 'CONNECTING' });
      stopChannel = subscribeRoomChannel(nextId, {
        onRoomUpdated: room => {
          if (!active) return;
          revision++; send({ type: 'ROOM_UPDATED', room }); void refresh();
        },
        onParticipantInserted: participant => {
          if (!active) return;
          revision++; send({ type: 'PARTICIPANT_INSERTED', participant });
          const timer = setTimeout(() => { highlightTimers.delete(timer); send({ type: 'PARTICIPANT_HIGHLIGHT_FINISHED', participantId: participant.id }); }, 3000);
          highlightTimers.add(timer);
        },
        onParticipantDeleted: participant => {
          if (!active) return;
          // old.user_id/room_id pueden faltar bajo RLS. El reducer conoce la PK
          // propia; la recarga verifica también la membresía en el servidor.
          revision++; send({ type: 'PARTICIPANT_DELETED', participantId: participant.id }); void refresh();
        },
        onStatus: channelStatus => {
          if (!active) return;
          updateMeta({ channelStatus });
          if (channelStatus === 'SUBSCRIBED') void refresh();
        },
      });
    };
    function refresh() {
      dirty = true;
      if (pending) return pending;
      updateMeta({ refreshing: true });
      pending = (async () => {
        while (active && dirty) {
          dirty = false;
          const ticket = revision;
          try {
            const { data } = await loadRoomSession(code);
            if (!active) return;
            if (ticket !== revision) { dirty = true; continue; }
            send({ type: firstLoad ? 'LOADED' : 'SYNCED', data, userId });
            firstLoad = false;
            connect(data);
          } catch (error) {
            if (!active) return;
            if (ticket !== revision) { dirty = true; continue; }
            send({ type: 'FAILED', error });
          }
        }
      })().finally(() => { pending = null; updateMeta({ refreshing: false }); });
      return pending;
    }
    function join() {
      if (joinPending) return joinPending;
      updateMeta({ joining: true }); send({ type: 'CLEAR_ERROR' });
      joinPending = (async () => {
        try { await joinRoom(code); if (active) await refresh(); }
        catch (error) { send({ type: 'FAILED', error }); }
        finally { joinPending = null; updateMeta({ joining: false }); }
      })();
      return joinPending;
    }
    const dispatchLocal = action => {
      if (['ROOM_UPDATED', 'PARTICIPANT_INSERTED', 'PARTICIPANT_DELETED', 'REMOVED', 'CANCELLED'].includes(action.type)) revision++;
      send(action);
    };
    const controller = { scope, refresh, join, dispatch: dispatchLocal };
    runtime.current = controller;
    if (userId) void refresh();
    const onVisible = () => { if (document.visibilityState === 'visible' && roomId) void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    const onOnline = () => { if (userId) void refresh(); };
    window.addEventListener('online', onOnline);
    return () => {
      active = false; stopChannel?.();
      highlightTimers.forEach(timer => clearTimeout(timer));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      if (runtime.current === controller) runtime.current = null;
    };
  }, [code, userId, scope]);
  const dispatch = useCallback(action => { if (runtime.current?.scope === scope) runtime.current.dispatch(action); }, [scope]);
  const refresh = useCallback(() => runtime.current?.scope === scope ? runtime.current.refresh() : Promise.resolve(), [scope]);
  const retry = useCallback(() => { dispatch({ type: 'CLEAR_ERROR' }); return refresh(); }, [dispatch, refresh]);
  const join = useCallback(() => runtime.current?.scope === scope ? runtime.current.join() : Promise.resolve(), [scope]);
  const visible = state.scope === scope ? state : initialRoomState;
  const visibleMeta = meta.scope === scope ? meta : { joining: false, channelStatus: 'CONNECTING', refreshing: false };
  return { ...visible, state: visible, ...visibleMeta, isOnline, dispatch, refresh, retry, join };
}


