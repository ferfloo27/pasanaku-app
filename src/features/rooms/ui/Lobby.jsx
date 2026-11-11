import { useId } from 'react';
import Chip from '../../../shared/ui/Chip';
import RoomCodeBlock from './RoomCodeBlock';
import RoomSummary from './RoomSummary';
import ParticipantList from './ParticipantList';
import './lobby.css';

export default function Lobby({ room, participants, userId, newParticipantIds = [] }) {
  const titleId = useId();
  return <section className="room-lobby" aria-labelledby={titleId}>
    <header className="room-lobby__header"><div><h1 id={titleId}>{room.name}</h1><Chip variant="waiting">En espera</Chip></div></header>
    <div className="room-lobby__waiting" role="status"><span className="room-lobby__dots" aria-hidden="true"><i /><i /><i /></span>
      <div><strong>Esperando a que {room.host_name} haga el sorteo</strong><p>Cuando lo anuncie, verás la revelación aquí mismo.</p></div></div>
    <RoomCodeBlock room={room} /><RoomSummary room={room} />
    <ParticipantList room={room} participants={participants} userId={userId} newParticipantIds={newParticipantIds} />
  </section>;
}
