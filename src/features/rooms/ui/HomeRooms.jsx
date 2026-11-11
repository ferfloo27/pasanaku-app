import { useMyRooms } from '../hooks/useMyRooms';
import EmptyState from '../../../shared/ui/EmptyState';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import Skeleton from '../../../shared/ui/Skeleton';
import { getErrorMessage } from '../../../shared/errors/appError';
import RoomCard from './RoomCard';
import CancellationNotice from './CancellationNotice';
import './homeRooms.css';

export default function HomeRooms() {
  const { rooms, notices, status, error, retry, dismissNotice } = useMyRooms();
  return <>
    {notices.map(room => <CancellationNotice key={room.id} room={room} onClose={() => dismissNotice(room.id)} />)}
    <section className={`home-rooms ${status === 'ready' && !rooms.length ? 'home-rooms--empty' : ''}`} aria-labelledby="my-rooms-title">
      <div className="home-rooms__heading"><h2 id="my-rooms-title">Tus salas</h2>
        {status === 'ready' && rooms.length > 0 && <span>{rooms.length} {rooms.length === 1 ? 'sala' : 'salas'}</span>}</div>
      {status === 'loading' && <Skeleton label="Cargando tus salas…" lines={3} />}
      {error && <ErrorBanner message={getErrorMessage(error)} onRetry={retry} />}
      {status === 'ready' && !rooms.length && <EmptyState />}
      {rooms.length > 0 && <ul className="home-rooms__list">{rooms.map(room => <li key={room.id}><RoomCard room={room} /></li>)}</ul>}
    </section>
  </>;
}
