import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import DraftEditor from './DraftEditor';
import { buildDraft, moveDraftItem } from '../domain/draft';
const room = { start_date: '2099-12-01', frequency: 'monthly' };
const people = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bea' }];
function Harness() {
  const [draft, setDraft] = useState(() => buildDraft(people, room, () => .999));
  return <DraftEditor room={room} draft={draft} onMove={(from, to) => setDraft(current => moveDraftItem(current, from, to, room))} onReshuffle={() => setDraft(buildDraft(people, room, () => 0))} onConfirm={() => {}} onBack={() => {}} />;
}
it('reordena mediante flechas y actualiza las fechas sin perder personas', () => {
  render(<Harness />);
  expect(screen.getByText(/Solo tú ves este borrador/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Subir a Ana' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Subir a Bea' }));
  expect(screen.getByRole('status', { name: 'Cambios del borrador' })).toHaveTextContent('Bea pasa al turno 1, Diciembre 2099.');
  const rows = screen.getAllByRole('listitem');
  expect(within(rows[0]).getByText('Bea')).toBeVisible();
  expect(within(rows[0]).getByText('Diciembre 2099')).toBeVisible();
  expect(within(rows[1]).getByText('Enero 2100')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Bajar a Ana' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Arrastrar a Bea' })).toBeEnabled();
});
it('permite volver a sortear y bloquea todas las acciones mientras anuncia', () => {
  const props = { room, draft: buildDraft(people, room, () => .999), onReshuffle: vi.fn(), onMove: vi.fn(), onConfirm: vi.fn(), onBack: vi.fn() };
  const view = render(<DraftEditor {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Volver a sortear' }));
  expect(props.onReshuffle).toHaveBeenCalledOnce();
  view.rerender(<DraftEditor {...props} busy />);
  for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
});
it('un cambio de participantes exige nuevo sorteo antes de anunciar', () => {
  render(<DraftEditor room={room} draft={buildDraft(people, room)} participantsChanged onMove={() => {}} onReshuffle={() => {}} onConfirm={() => {}} onBack={() => {}} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Alguien entró o salió');
  expect(screen.getByRole('button', { name: 'Confirmar y anunciar' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Volver a sortear' })).toBeEnabled();
});
