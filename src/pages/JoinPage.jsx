import { useNavigate } from 'react-router-dom';
import JoinRoomForm from '../components/JoinRoomForm';

export default function JoinPage() {
  const navigate = useNavigate();
  return <main className="identity-page__body"><JoinRoomForm onBack={() => navigate('/')} /></main>;
}
