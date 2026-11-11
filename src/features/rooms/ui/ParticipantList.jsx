import { useId } from 'react';
import Avatar from '../../../shared/ui/Avatar';
import Chip from '../../../shared/ui/Chip';
import IconButton from '../../../shared/ui/IconButton';
import './lobby.css';

export default function ParticipantList({ room, participants, userId, newParticipantIds = [], onRemoveParticipant, busy = false }) {
  const titleId = useId();
  const isHost = Boolean(userId) && userId === room.host_user_id;
  return <section className="room-participants" aria-labelledby={titleId}>
    <h2 id={titleId}>Participantes ({participants.length}/{room.max_participants})</h2>
    <ul className="room-participants__list" aria-labelledby={titleId} aria-live="polite" aria-relevant="additions removals text">
      {participants.map(person => {
        const host = person.user_id === room.host_user_id;
        const self = person.user_id === userId;
        const recent = newParticipantIds.includes(person.id);
        return <li key={person.id} className={`room-participants__row${recent ? ' room-participants__row--new' : ''}`}>
          <Avatar name={person.name} variant={host ? 'primary' : 'soft'} />
          <div className="room-participants__name"><strong>{person.name}</strong>{recent && <span>Acaba de entrar</span>}</div>
          <div className="room-participants__badges">{host && <Chip variant="host">Anfitrión</Chip>}{self && <Chip variant="self">Tú</Chip>}</div>
          {isHost && !host && !self && <IconButton label={`Eliminar a ${person.name}`} disabled={busy || !onRemoveParticipant} onClick={() => onRemoveParticipant?.(person)} className="room-participants__remove">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 10v8M14 10v8" /></svg>
          </IconButton>}
        </li>;
      })}
    </ul>
  </section>;
}
