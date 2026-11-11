import { useNavigate } from 'react-router-dom';
import RoomNotFound from '../features/rooms/ui/RoomNotFound';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return <main className="room-entry"><RoomNotFound onHome={() => navigate('/')} onEnterCode={() => navigate('/join')} /></main>;
}
