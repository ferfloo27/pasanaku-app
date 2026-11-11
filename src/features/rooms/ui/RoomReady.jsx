import Button from '../../../shared/ui/Button';
import Icon from '../../../shared/ui/Icon';
import RoomCodeBlock from './RoomCodeBlock';
import RoomSummary from './RoomSummary';
import './roomPresentation.css';

export default function RoomReady({ room, onEnter }) {
  return <section className="room-ready">
    <header className="room-ready__header"><span className="room-ready__check"><Icon name="check" size={32} /></span><h1>Sala lista</h1><p>Comparte el código con tu grupo. Cuando estén todos, haces el sorteo.</p></header>
    <RoomCodeBlock room={room} /><RoomSummary room={room} />
    <div className="room-ready__footer"><Button fullWidth onClick={() => onEnter(room.code)}>Ir a la sala</Button></div>
  </section>;
}
