import Button from '../../../shared/ui/Button';
import Card from '../../../shared/ui/Card';
import Avatar from '../../../shared/ui/Avatar';
import Chip from '../../../shared/ui/Chip';
import RoomSummary from './RoomSummary';
import RoomCodeBlock from './RoomCodeBlock';

export default function MemberRoom({ room, participants, userId, onHome }) {
  if (room.status === 'cancelled') return <div className="room-entry__state"><h1>{room.host_name} canceló la sala</h1><Button onClick={onHome}>Ir al inicio</Button></div>;
  return <div className="member-room">
    <header><h1>{room.name}</h1><Chip variant={room.status === 'drawn' ? 'drawn' : 'waiting'}>{room.status === 'drawn' ? 'Sorteada' : 'En espera'}</Chip></header>
    <RoomCodeBlock room={room} />
    <Card><RoomSummary room={room} /></Card>
    <section><h2>Participantes ({participants.length}/{room.max_participants})</h2>
      <ul className="member-room__participants">{participants.map(person => <li key={person.id}><Avatar name={person.name} /><b>{person.name}</b>
        {person.user_id === room.host_user_id && <Chip variant="host">Anfitrión</Chip>}{person.user_id === userId && <Chip variant="self">Tú</Chip>}</li>)}</ul>
    </section>
    <Button variant="text" fullWidth onClick={onHome}>Volver al inicio</Button>
  </div>;
}
