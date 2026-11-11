import Button from '../../../shared/ui/Button';
import Card from '../../../shared/ui/Card';
import Avatar from '../../../shared/ui/Avatar';
import Chip from '../../../shared/ui/Chip';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import { getErrorMessage } from '../../../shared/errors/appError';
import RoomSummary from './RoomSummary';
import './roomEntry.css';

export default function RoomPreview({ room, displayName, onJoin, onChangeName, onCancel, loading = false, error }) {
  const blocked = error?.code === 'ROOM_DRAWN' || room.status === 'drawn' ? 'drawn'
    : error?.code === 'ROOM_CANCELLED' || room.status === 'cancelled' ? 'cancelled'
      : error?.code === 'ROOM_FULL' || room.participant_count >= room.max_participants ? 'full' : null;
  const message = blocked === 'drawn' ? `Esta sala ya hizo su sorteo, así que no entran más personas. Pide a ${room.host_name} que te agregue a una nueva.`
    : blocked === 'cancelled' ? `${room.host_name} canceló esta sala. Si fue un error, pídele que cree otra y te pase el código.`
      : blocked === 'full' ? `La sala llegó a su máximo de ${room.max_participants} personas. Habla con ${room.host_name} para que libere un lugar.`
        : error ? getErrorMessage(error) : '';
  const status = blocked === 'drawn' ? 'Sorteada' : blocked === 'cancelled' ? 'Cancelada' : blocked === 'full' ? `Llena · ${room.max_participants}/${room.max_participants}` : 'En espera del sorteo';
  return <>
    <header className="room-entry__title"><p>Te invitaron a</p><h1>{room.name}</h1></header>
    <Card className="room-preview__card">
      <div className="room-preview__host"><Avatar name={room.host_name} variant="primary" /><div><b>{room.host_name}</b><span>Organiza el sorteo</span></div><Chip variant="host">Anfitrión</Chip></div>
      <div className="room-preview__count"><span>Participantes</span><b>{room.participant_count} de {room.max_participants}</b></div>
      <RoomSummary room={room} />
      <div className="room-preview__code"><b>{room.code}</b><Chip variant={blocked === 'drawn' ? 'drawn' : blocked === 'cancelled' ? 'neutral' : 'waiting'}>{status}</Chip></div>
      {message && <ErrorBanner message={message} />}
    </Card>
    <footer className="room-entry__footer">
      {!blocked && <><div className="room-preview__identity"><span>Entrarás como <b>{displayName}</b></span><Button variant="text" compact onClick={onChangeName} disabled={loading}>Cambiar</Button></div>
        <Button fullWidth onClick={onJoin} loading={loading} loadingText="Uniéndote…">Unirme</Button></>}
      <Button variant="text" fullWidth onClick={onCancel} disabled={loading}>{blocked ? 'Volver al inicio' : 'Ahora no'}</Button>
    </footer>
  </>;
}
