import { useId } from 'react';
import Button from '../../../shared/ui/Button';
import Chip from '../../../shared/ui/Chip';
import EmptyState from '../../../shared/ui/EmptyState';
import RoomCodeBlock from './RoomCodeBlock';
import RoomSummary from './RoomSummary';
import ParticipantList from './ParticipantList';
import RoomMenu from './RoomMenu';
import './lobby.css';

export default function Lobby({ room, participants, userId, newParticipantIds = [], onDraw, onRemoveParticipant, onCancelRoom, busy = false }) {
  const titleId = useId();
  const whyId = useId();
  const isHost = Boolean(userId) && userId === room.host_user_id;
  const tooFew = participants.length < 2;
  const drawExplanation = tooFew ? 'Necesitas al menos 2 participantes para sortear.'
    : !onDraw ? 'El sorteo estará disponible pronto.'
      : 'Primero verás un borrador que solo tú puedes ver.';
  return <section className="room-lobby" aria-labelledby={titleId}>
    <header className="room-lobby__header">
      <div><h1 id={titleId}>{room.name}</h1><Chip variant="waiting">En espera</Chip></div>
      {isHost && <RoomMenu onCancelRoom={onCancelRoom} busy={busy} />}
    </header>
    {!isHost && <div className="room-lobby__waiting" role="status">
      <span className="room-lobby__dots" aria-hidden="true"><i /><i /><i /></span>
      <div><strong>Esperando a que {room.host_name} haga el sorteo</strong><p>Cuando lo anuncie, verás la revelación aquí mismo.</p></div>
    </div>}
    <RoomCodeBlock room={room} />
    <RoomSummary room={room} />
    <ParticipantList room={room} participants={participants} userId={userId}
      newParticipantIds={newParticipantIds} onRemoveParticipant={isHost ? onRemoveParticipant : undefined} busy={busy} />
    {tooFew && <EmptyState title="Todavía no entra nadie" description="Comparte el código con tu grupo. Verás a cada persona aparecer aquí." />}
    {isHost && <footer className="room-lobby__footer">
      <Button fullWidth disabled={tooFew || busy || !onDraw} onClick={() => onDraw?.()} aria-describedby={whyId}>Sortear orden</Button>
      <p id={whyId}>{drawExplanation}</p>
    </footer>}
  </section>;
}
