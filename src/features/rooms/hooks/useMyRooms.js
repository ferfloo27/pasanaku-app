import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { listMyRooms } from '../api/roomsApi';
import { hasSeenCancellation, markCancellationSeen } from './cancelledNotices';

function takeUnseenNotices(data, userId) {
  return data.filter(room => {
    if (room.status !== 'cancelled') return false;
    if (hasSeenCancellation(userId, room.id)) return false;
    markCancellationSeen(userId, room.id);
    return true;
  });
}
const empty = { rooms: [], notices: [], error: null };
export function useMyRooms() {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState({ ...empty, userId: null, status: 'idle' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (userId) listMyRooms().then(({ data }) => {
      if (!active) return;
      const rows = data || [];
      const notices = takeUnseenNotices(rows, userId);
      setState(current => ({ userId, status: 'ready', error: null,
        rooms: rows.filter(room => room.status === 'waiting' || room.status === 'drawn'),
        notices: [...(current.userId === userId ? current.notices : []), ...notices] }));
    }).catch(error => {
      if (active) setState(current => ({ ...(current.userId === userId ? current : empty), userId, status: 'error', error }));
    });
    return () => { active = false; };
  }, [userId, attempt]);
  const retry = useCallback(() => {
    setState(current => ({ ...current, status: 'loading', error: null }));
    setAttempt(value => value + 1);
  }, []);
  const dismissNotice = useCallback(id => setState(current => ({ ...current,
    notices: current.notices.filter(room => room.id !== id) })), []);
  const visible = state.userId === userId ? state : { ...empty, status: userId ? 'loading' : 'idle' };
  return { ...visible, retry, dismissNotice };
}
