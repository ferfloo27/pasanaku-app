import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { useProfile } from '../../profile/hooks/useProfile';
import ProfileNameSheet from '../../profile/ui/ProfileNameSheet';
import { fetchMemberRoom, getRoomPreview, joinRoom } from '../api/previewApi';
import { getErrorMessage } from '../../../shared/errors/appError';
import AguayoStripe from '../../../shared/ui/AguayoStripe';
import Button from '../../../shared/ui/Button';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import Spinner from '../../../shared/ui/Spinner';
import RoomPreview from './RoomPreview';
import MemberRoom from './MemberRoom';
import './roomEntry.css';

function Entry({ code, userId }) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [editing, setEditing] = useState(false);
  const active = useRef(false);
  const joinLock = useRef(false);
  const loadTicket = useRef(null);
  useEffect(() => {
    active.current = true;
    const ticket = Symbol();
    loadTicket.current = ticket;
    getRoomPreview(code).then(async ({ data: preview }) => {
      if (!active.current || loadTicket.current !== ticket) return;
      if (preview.is_member) {
        const { data } = await fetchMemberRoom(code);
        if (active.current && loadTicket.current === ticket) setState({ status: 'member', ...data });
      } else setState({ status: 'preview', room: preview });
    }).catch(error => {
      if (active.current && loadTicket.current === ticket) setState({ status: 'error', error });
    });
    return () => { active.current = false; loadTicket.current = null; };
  }, [code, attempt]);
  async function join() {
    if (joinLock.current) return;
    joinLock.current = true;
    setJoining(true); setJoinError(null);
    try {
      await joinRoom(code);
      if (!active.current) return;
      const { data } = await fetchMemberRoom(code);
      if (active.current) setState({ status: 'member', ...data });
    } catch (error) {
      if (active.current) setJoinError(error);
    } finally {
      joinLock.current = false;
      if (active.current) setJoining(false);
    }
  }
  function retry() { setState({ status: 'loading' }); setAttempt(value => value + 1); }
  return <main className="room-entry"><AguayoStripe />
    {state.status === 'loading' && <div className="room-entry__state" role="status"><Spinner decorative /><p>Cargando sala…</p></div>}
    {state.status === 'error' && <div className="room-entry__state">
      {state.error?.code === 'ROOM_NOT_FOUND' ? <><h1>No encontramos esta sala</h1><p>Revisa el código o pide un nuevo link a quien organiza.</p></>
        : <ErrorBanner message={getErrorMessage(state.error)} onRetry={retry} />}
      <Button variant="text" onClick={() => navigate('/')}>Volver al inicio</Button>
    </div>}
    {state.status === 'preview' && <RoomPreview room={state.room} displayName={profile?.display_name || ''}
      onJoin={join} loading={joining} error={joinError} onChangeName={() => setEditing(true)} onCancel={() => navigate('/')} />}
    {state.status === 'member' && <MemberRoom room={state.room} participants={state.participants} userId={userId} onHome={() => navigate('/')} />}
    <ProfileNameSheet open={editing} initialName={profile?.display_name || ''} onClose={() => setEditing(false)} />
  </main>;
}
export default function RoomEntry() {
  const { code } = useParams();
  const { user } = useAuth();
  return <Entry key={`${user?.id || 'no-session'}:${code}`} code={code} userId={user?.id} />;
}
