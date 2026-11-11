import { useEffect, useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import { resultRows } from '../domain/results';
import { formatTurnDate } from '../../../shared/format/dates';
import AguayoStripe from '../../../shared/ui/AguayoStripe';
import Button from '../../../shared/ui/Button';
import Chip from '../../../shared/ui/Chip';
import './reveal.css';

export default function Reveal({ room, turns, participants, userId, onResults }) {
  const rows = resultRows(turns, participants);
  const { visibleCount, done, skip, replay, reducedMotion } = useReveal(rows.length);
  const current = rows[visibleCount - 1];
  const own = rows.find(row => row.user_id === userId);
  const [speechReady, setSpeechReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSpeechReady(true), 0);
    return () => clearTimeout(timer);
  }, []);
  const ownText = own ? `Tu turno es el ${own.position}, en ${formatTurnDate(own.turn_date, room.frequency)}.` : '';
  const announcement = done ? `Orden listo. ${ownText}` : current ? `Le toca a ${current.name}. Turno ${current.position} · ${formatTurnDate(current.turn_date, room.frequency)}` : '';
  const revealed = done ? rows : rows.slice(0, Math.max(0, visibleCount - 1));
  return <section className="draw-reveal" data-reduced-motion={reducedMotion}>
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{speechReady ? announcement : ''}</div>
    <header className="draw-reveal__header"><AguayoStripe height={96} />
      <div><strong>{room.name}</strong><span>{done ? `${rows.length} de ${rows.length}` : `Turno ${current?.position || 0} de ${rows.length}`}</span></div>
    </header>
    <div className="draw-reveal__body"><Chip variant="waiting">Sorteado al azar</Chip>
      {!done && current && <><h1>¿A quién le toca el turno {current.position}?</h1>
        <div aria-hidden="true" className="draw-reveal__live">
          <div className="draw-reveal__card" key={current.id}><span className="draw-reveal__position">{current.position}</span>
            <strong>Le toca a {current.name}</strong><p>Turno {current.position} · {formatTurnDate(current.turn_date, room.frequency)}</p></div>
        </div></>}
      {done && <div className="draw-reveal__complete"><AguayoStripe variant="steps" />
        <h1>Orden listo</h1>{own && <p>{ownText}</p>}</div>}
      {revealed.length > 0 && <section className="draw-reveal__previous"><h2>{done ? 'Orden completo' : 'Ya salieron'}</h2>
        <ol aria-label={done ? 'Orden completo' : 'Ya salieron'}>{revealed.map(row => <li key={row.id} className={row.user_id === userId ? 'draw-reveal__own' : ''}>
          <b>{row.position}</b><strong>{row.name}{row.user_id === userId ? ' · Tú' : ''}</strong><span>{formatTurnDate(row.turn_date, room.frequency)}</span></li>)}</ol>
      </section>}
      <footer className="draw-reveal__actions">{done ? <><Button fullWidth onClick={onResults}>Ver resultados</Button><Button fullWidth variant="text" onClick={replay}>Ver de nuevo</Button></>
        : <Button fullWidth variant="secondary" onClick={() => { skip(); onResults(); }}>Saltar</Button>}</footer>
    </div>
  </section>;
}
