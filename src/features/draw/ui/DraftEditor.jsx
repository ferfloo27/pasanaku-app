import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import Button from '../../../shared/ui/Button';
import IconButton from '../../../shared/ui/IconButton';
import ErrorBanner from '../../../shared/ui/ErrorBanner';
import { formatTurnDate } from '../../../shared/format/dates';
import { getErrorMessage } from '../../../shared/errors/appError';
import './draft.css';

function DraftRow({ row, frequency, count, onMove, disabled }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: row.participantId, disabled });
  const style = { '--draft-transform': transform ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})` : undefined, '--draft-transition': transition };
  return <li ref={setNodeRef} style={style} className={`draft-row${isDragging ? ' draft-row--dragging' : ''}`}>
    <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} disabled={disabled} aria-label={`Arrastrar a ${row.name}`} className="ui-icon-button draft-row__handle"><span aria-hidden="true">⠿</span></button>
    <b className="draft-row__position">{row.position}</b>
    <div className="draft-row__person"><strong>{row.name}</strong><span>{formatTurnDate(row.turnDate, frequency)}</span></div>
    <IconButton label={`Subir a ${row.name}`} disabled={disabled || row.position === 1} onClick={() => onMove(row.position - 1, row.position - 2)}>↑</IconButton>
    <IconButton label={`Bajar a ${row.name}`} disabled={disabled || row.position === count} onClick={() => onMove(row.position - 1, row.position)}>↓</IconButton>
  </li>;
}
export default function DraftEditor({ room, draft, onMove, onReshuffle, onConfirm, onBack, busy = false, participantsChanged = false, error, onRetry, canReshuffle = true }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const name = id => draft.find(row => row.participantId === id)?.name || 'Participante';
  const announcements = {
    onDragStart: ({ active }) => `Levantaste a ${name(active.id)}. Usa las flechas para mover y espacio para soltar.`,
    onDragOver: ({ active, over }) => over ? `${name(active.id)} sobre la posición ${draft.findIndex(row => row.participantId === over.id) + 1}.` : undefined,
    onDragEnd: ({ active, over }) => over ? `${name(active.id)} en la posición ${draft.findIndex(row => row.participantId === over.id) + 1}.` : 'Movimiento cancelado.',
    onDragCancel: () => 'Movimiento cancelado.',
  };
  function finish({ active, over }) {
    if (busy || participantsChanged || !over || active.id === over.id) return;
    const from = draft.findIndex(row => row.participantId === active.id), to = draft.findIndex(row => row.participantId === over.id);
    if (from >= 0 && to >= 0) onMove(from, to);
  }
  return <section className="draft-editor">
    <Button variant="text" disabled={busy} onClick={onBack}>Volver a la sala</Button>
    <h1>Borrador del sorteo</h1>
    <p className="draft-editor__privacy"><strong>Solo tú ves este borrador.</strong> Ajusta el orden si hace falta y luego anúncialo.</p>
    {participantsChanged ? <ErrorBanner message={getErrorMessage({ code: 'PARTICIPANTS_CHANGED' })} /> : error && <ErrorBanner message={getErrorMessage(error)} onRetry={onRetry} loading={busy} />}
    <h2>Orden de cobro</h2><p className="draft-editor__hint">Arrastra o usa las flechas</p>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={finish} accessibility={{ announcements, screenReaderInstructions: { draggable: 'Pulsa espacio para levantar. Usa las flechas para mover, espacio para soltar y Escape para cancelar.' } }}>
      <SortableContext items={draft.map(row => row.participantId)} strategy={verticalListSortingStrategy}>
        <ol className="draft-editor__list" aria-label="Orden de cobro">{draft.map(row => <DraftRow key={row.participantId} row={row} frequency={room.frequency} count={draft.length} onMove={onMove} disabled={busy || participantsChanged} />)}</ol>
      </SortableContext>
    </DndContext>
    <footer className="draft-editor__actions"><Button fullWidth disabled={busy || participantsChanged || draft.length < 2 || !onConfirm} onClick={onConfirm}>Confirmar y anunciar</Button>
      <Button fullWidth variant="secondary" disabled={busy || !canReshuffle} onClick={onReshuffle}>Volver a sortear</Button></footer>
  </section>;
}
