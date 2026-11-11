import { useEffect, useRef, useState } from 'react';
import { cancelRoom, removeParticipant } from '../api/roomManagementApi';

export function useRoomManagement({ onRemoved, onCancelled } = {}) {
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const active = useRef(false);
  const pending = useRef(false);
  const generation = useRef(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; generation.current = null; };
  }, []);
  function select(value) {
    if (pending.current) return;
    generation.current = Symbol();
    setSelection(value); setError(null);
  }
  function close() {
    if (pending.current) return;
    generation.current = null;
    setSelection(null); setError(null);
  }
  async function confirm() {
    if (!selection || pending.current) return;
    const ticket = generation.current;
    pending.current = true; setLoading(true); setError(null);
    try {
      if (selection.type === 'remove') await removeParticipant(selection.participant.id);
      else await cancelRoom(selection.room.id);
      if (!active.current || generation.current !== ticket) return;
      setSelection(null);
      if (selection.type === 'remove') onRemoved?.(selection.participant);
      else onCancelled?.(selection.room);
    } catch (failure) {
      if (active.current && generation.current === ticket) setError(failure);
    } finally {
      pending.current = false;
      if (active.current) setLoading(false);
    }
  }
  return { selection, loading, error, selectParticipant: participant => select({ type: 'remove', participant }),
    selectCancellation: room => select({ type: 'cancel', room }), close, confirm };
}
