import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { useProfile } from '../../profile/hooks/useProfile';
import ProfileNameSheet from '../../profile/ui/ProfileNameSheet';
import { useRoomSession } from '../hooks/useRoomSession';
import { useRoomManagement } from '../hooks/useRoomManagement';
import { getErrorMessage } from '../../../shared/errors/appError';
import AguayoStripe from '../../../shared/ui/AguayoStripe';
import Button from '../../../shared/ui/Button';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import ReconnectingChip from '../../../shared/ui/ReconnectingChip';
import Skeleton from '../../../shared/ui/Skeleton';
import RoomPreview from './RoomPreview';
import Reveal from '../../draw/ui/Reveal';
import Results from '../../draw/ui/Results';
import { hasCompleteDraw } from '../../draw/domain/results';
import Lobby from './Lobby';
import DrawFlow from '../../draw/ui/DrawFlow';
import RemoveParticipantSheet from './RemoveParticipantSheet';
import CancelRoomSheet from './CancelRoomSheet';
import { RemovedRoom } from './RoomStateViews';
import './roomEntry.css';

function Entry({ code, userId }) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const session = useRoomSession(code);
  const { state, status, room, participants, turns, error, retry, joining, join, channelStatus, isOnline, refreshing, dispatch, refresh } = session;
  const [editing, setEditing] = useState(false);
  const management = useRoomManagement({
    onRemoved: participant => { dispatch({ type: 'PARTICIPANT_DELETED', participantId: participant.id }); refresh(); },
    onCancelled: cancelledRoom => dispatch({ type: 'CANCELLED', room: cancelledRoom }),
  });
  if (status === 'cancelled' && room) return <Navigate to="/" replace state={{ roomNotice: { type: 'cancelled', room } }} />;
  const selection = management.selection;
  const memberView = ['results', 'revealing'].includes(status);
  const drawReady = memberView && hasCompleteDraw(turns, participants);
  const offline = !isOnline || error?.code === 'NETWORK';
  const feedbackError = !['preview', 'not_found'].includes(status) && error;
  return <main className="room-entry">{!memberView && <AguayoStripe />}
    {offline ? <ErrorBanner message={getErrorMessage({ code: 'NETWORK' })} onRetry={retry} loading={refreshing} />
      : feedbackError && <ErrorBanner message={getErrorMessage(error)} onRetry={retry} loading={refreshing} />}
    {!offline && ['lobby', 'drafting', 'revealing', 'results'].includes(status) && channelStatus && channelStatus !== 'SUBSCRIBED' && <ReconnectingChip />}
    {status === 'loading' && !error && <div className="room-entry__state"><Skeleton label="Cargando sala…" lines={4} /></div>}
    {(status === 'not_found' || (status === 'loading' && error)) && <div className="room-entry__state">
      {status === 'not_found' ? <><h1>No encontramos esta sala</h1><p>Revisa el código o pide un nuevo link a quien organiza.</p></>
        : null}
      <Button variant="text" onClick={() => navigate('/')}>Volver al inicio</Button>
    </div>}
    {status === 'preview' && room && <RoomPreview room={room} displayName={profile?.display_name || ''}
      onJoin={join} loading={joining} error={offline ? null : error} onChangeName={() => setEditing(true)} onCancel={() => navigate('/')} />}
    {status === 'lobby' && room && <>
      <Button variant="text" compact onClick={() => navigate('/')} className="room-entry__back">← Volver al inicio</Button>
      <Lobby room={room} participants={participants} userId={userId} newParticipantIds={state.newParticipantIds}
        onDraw={() => dispatch({ type: 'START_DRAFT' })}
        onRemoveParticipant={management.selectParticipant} onCancelRoom={() => management.selectCancellation(room)} busy={management.loading} />
    </>}
    {status === 'drafting' && room?.host_user_id === userId && <>
      <DrawFlow room={room} participants={participants} onBack={() => dispatch({ type: 'CANCEL_DRAFT' })} onResync={refresh}
        onConfirmed={() => { dispatch({ type: 'ROOM_UPDATED', room: { ...room, status: 'drawn' } }); refresh(); }} />
    </>}
    {memberView && room && <>
      {!drawReady ? <div className="room-entry__state"><Skeleton label="Cargando resultados…" lines={3} /></div>
        : status === 'revealing' ? <Reveal room={room} turns={turns} participants={participants} userId={userId} onResults={() => dispatch({ type: 'REVEAL_FINISHED' })} />
          : <Results room={room} turns={turns} participants={participants} userId={userId} onHome={() => navigate('/')} />}
    </>}
    {status === 'removed' && room && <RemovedRoom room={room} onHome={() => navigate('/')} />}
    <ProfileNameSheet open={editing && status === 'preview'} initialName={profile?.display_name || ''} onClose={() => setEditing(false)} />
    <RemoveParticipantSheet open={status === 'lobby' && selection?.type === 'remove'} participant={selection?.participant}
      onClose={management.close} onConfirm={management.confirm} loading={management.loading} error={management.error} />
    <CancelRoomSheet open={status === 'lobby' && selection?.type === 'cancel'} room={selection?.room}
      onClose={management.close} onConfirm={management.confirm} loading={management.loading} error={management.error} />
  </main>;
}
export default function RoomEntry() {
  const { code } = useParams();
  const { user } = useAuth();
  return <Entry key={`${user?.id || 'no-session'}:${code}`} code={code} userId={user?.id} />;
}
