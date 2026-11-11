import { useNavigate } from 'react-router-dom';
import CreateRoomForm from '../components/CreateRoomForm';

export default function NewRoomPage() {
  const navigate = useNavigate();
  return <main className="identity-page__body"><CreateRoomForm onBack={() => navigate('/')} /></main>;
}
