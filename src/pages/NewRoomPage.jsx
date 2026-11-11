import { useNavigate } from 'react-router-dom';
import CreateRoomFlow from '../features/rooms/ui/CreateRoomFlow';

export default function NewRoomPage() {
  const navigate = useNavigate();
  return <main className="identity-page__body"><CreateRoomFlow onBack={() => navigate('/')} onEnter={code => navigate(`/room/${code}`)} /></main>;
}
