import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { getRoomPreview } from '../api/previewApi';
import JoinCodeForm from './JoinCodeForm';

function Search() {
  const navigate = useNavigate();
  const active = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function search(code) {
    await getRoomPreview(code);
    if (active.current) navigate(`/room/${code}`);
  }
  return <JoinCodeForm onSearch={search} />;
}
export default function JoinRoomSearch() {
  const { user } = useAuth();
  return <Search key={user?.id || 'no-session'} />;
}
