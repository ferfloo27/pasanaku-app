import { useEffect, useRef, useState } from 'react';
import { useDraft } from '../hooks/useDraft';
import { confirmDraw } from '../api/drawApi';
import DraftEditor from './DraftEditor';
import ConfirmDrawSheet from './ConfirmDrawSheet';
import { draftToOrder } from '../domain/draft';

export default function DrawFlow({ room, participants, onBack, onConfirmed, onResync, random }) {
  const { draft, participantsChanged, move, reshuffle } = useDraft(participants, room, random);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [needsNew, setNeedsNew] = useState(false);
  const [noLongerWaiting, setNoLongerWaiting] = useState(false);
  const pending = useRef(false), active = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const changed = participantsChanged || needsNew;
  const canConfirm = !changed && !noLongerWaiting && participants.length >= 2;
  const resync = () => { void Promise.resolve().then(() => onResync?.()).catch(() => { /* La sesión conserva su propio error de lectura. */ }); };
  function regenerate() {
    if (pending.current || noLongerWaiting || participants.length < 2) return;
    reshuffle(); setNeedsNew(false); setError(null); setConfirming(false);
  }
  function review() { if (!pending.current && canConfirm) { setError(null); setConfirming(true); } }
  async function announce() {
    if (pending.current || !canConfirm) return;
    pending.current = true; setBusy(true);
    try { await confirmDraw(room.id, draftToOrder(draft)); }
    catch (failure) {
      if (!active.current) return;
      setError(failure); setConfirming(false);
      if (['PARTICIPANTS_CHANGED', 'NOT_ENOUGH_PARTICIPANTS'].includes(failure.code)) { setNeedsNew(true); resync(); }
      if (failure.code === 'ROOM_NOT_WAITING') { setNoLongerWaiting(true); resync(); }
      return;
    } finally { pending.current = false; if (active.current) setBusy(false); }
    if (active.current) { setConfirming(false); onConfirmed?.(); }
  }
  return <>
    <DraftEditor room={room} draft={draft} onMove={(from, to) => { if (!pending.current && !changed && !noLongerWaiting) move(from, to); }} onReshuffle={regenerate}
      onConfirm={canConfirm ? review : undefined} onBack={onBack} busy={busy} participantsChanged={changed} error={error}
      onRetry={noLongerWaiting ? resync : review} readOnly={noLongerWaiting} canReshuffle={!noLongerWaiting && participants.length >= 2} />
    <ConfirmDrawSheet open={confirming && canConfirm} room={room} draft={draft} loading={busy} onConfirm={announce} onClose={() => { if (!pending.current) setConfirming(false); }} />
  </>;
}
