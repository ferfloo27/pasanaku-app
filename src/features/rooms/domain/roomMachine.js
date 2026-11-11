/**
 * LOADED/SYNCED: {data:{room,participants,turns,isMember},userId?}.
 * ROOM_UPDATED:{room}, PARTICIPANT_INSERTED:{participant},
 * PARTICIPANT_DELETED:{participantId} (Realtime DELETE puede traer solo PK).
 * FAILED:{error}, LOADING, REMOVED, CANCELLED:{room?}, CLEAR_ERROR,
 * START_DRAFT, CANCEL_DRAFT y REVEAL_FINISHED son transiciones locales.
 */
export const initialRoomState = { status: 'loading', room: null, participants: [], turns: [], userId: null, error: null, newParticipantIds: [] };
const memberStates = ['lobby', 'drafting', 'revealing', 'results'];
export function roomReducer(state, action) {
  switch (action.type) {
    case 'LOADING': return { ...state, status: 'loading', error: null };
    case 'CLEAR_ERROR': return { ...state, error: null };
    case 'FAILED': return { ...state, status: action.error?.code === 'ROOM_NOT_FOUND' ? 'not_found' : state.status, error: action.error };
    case 'LOADED':
    case 'SYNCED': {
      const { room, participants = [], turns = [], isMember } = action.data;
      const mergedRoom = { ...state.room, ...room };
      const wasMember = memberStates.includes(state.status) || state.status === 'removed';
      let status = room.status === 'cancelled' && (isMember || wasMember) ? 'cancelled'
        : !isMember ? (wasMember ? 'removed' : 'preview')
          : room.status === 'drawn' ? 'results' : 'lobby';
      if (action.type === 'SYNCED' && isMember) {
        if (['lobby', 'drafting'].includes(state.status) && state.room?.status === 'waiting' && room.status === 'drawn') status = 'revealing';
        if (state.status === 'revealing' && room.status === 'drawn') status = 'revealing';
        if (state.status === 'drafting' && room.status === 'waiting') status = 'drafting';
      }
      return { ...state, status, room: mergedRoom, participants, turns,
        userId: action.userId ?? state.userId, error: null,
        newParticipantIds: state.newParticipantIds.filter(id => participants.some(person => person.id === id)) };
    }
    case 'ROOM_UPDATED': {
      if (!state.room || action.room.id !== state.room.id) return state;
      const room = { ...state.room, ...action.room };
      const status = room.status === 'cancelled' ? 'cancelled'
        : state.room.status === 'waiting' && room.status === 'drawn' && ['lobby', 'drafting'].includes(state.status) ? 'revealing' : state.status;
      return { ...state, room, status };
    }
    case 'PARTICIPANT_INSERTED': {
      const participant = action.participant;
      if (!memberStates.includes(state.status) || (participant.room_id && participant.room_id !== state.room?.id)
        || state.participants.some(person => person.id === participant.id)) return state;
      return { ...state, participants: [...state.participants, participant], newParticipantIds: [...state.newParticipantIds, participant.id] };
    }
    case 'PARTICIPANT_DELETED': {
      const own = state.participants.some(person => person.id === action.participantId && person.user_id === state.userId);
      return { ...state, status: own ? 'removed' : state.status,
        participants: state.participants.filter(person => person.id !== action.participantId),
        newParticipantIds: state.newParticipantIds.filter(id => id !== action.participantId) };
    }
    case 'REMOVED': return { ...state, status: 'removed', error: null };
    case 'CANCELLED': return { ...state, status: 'cancelled', room: { ...state.room, ...action.room, status: 'cancelled' }, error: null };
    case 'PARTICIPANT_HIGHLIGHT_FINISHED': return { ...state, newParticipantIds: state.newParticipantIds.filter(id => id !== action.participantId) };
    case 'START_DRAFT': return state.status === 'lobby' && state.room?.host_user_id === state.userId && state.participants.length >= 2 ? { ...state, status: 'drafting' } : state;
    case 'CANCEL_DRAFT': return state.status === 'drafting' ? { ...state, status: 'lobby' } : state;
    case 'REVEAL_FINISHED': return state.status === 'revealing' ? { ...state, status: 'results' } : state;
    default: return state;
  }
}


