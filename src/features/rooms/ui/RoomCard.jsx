import { Link } from 'react-router-dom';
import Chip from '../../../shared/ui/Chip';
export default function RoomCard({ room }) {
  return <Link className="home-room-card" to={`/room/${room.code}`}>
    <div className="home-room-card__heading"><h3>{room.name}</h3>
      <Chip variant={room.status === 'drawn' ? 'drawn' : 'waiting'}>{room.status === 'drawn' ? 'Sorteada' : 'En espera'}</Chip>
    </div>
    <div className="home-room-card__meta"><code>{room.code}</code><span aria-hidden="true">·</span>
      <span>{room.participant_count} participantes</span><span aria-hidden="true">·</span>
      <span>{room.is_host ? 'Anfitrión' : 'Participante'}</span></div>
  </Link>;
}
