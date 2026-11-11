import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import Lobby from './Lobby';

const room = { id: 'room', name: 'Familia', code: 'ABC123', host_user_id: 'host-user', host_name: 'Rosa', contribution_bs: 200, frequency: 'monthly', start_date: '2027-01-01', max_participants: 30, status: 'waiting' };
const host = { id: 'host-participant', user_id: 'host-user', name: 'Rosa' };
const member = { id: 'member-participant', user_id: 'member-user', name: 'Lucía' };

it('muestra al participante la espera, resumen, código y roles sin controles de gestión', () => {
  const onDraw = vi.fn(), onRemoveParticipant = vi.fn(), onCancelRoom = vi.fn();
  render(<Lobby room={room} participants={[member, host]} userId={member.user_id} onDraw={onDraw} onRemoveParticipant={onRemoveParticipant} onCancelRoom={onCancelRoom} />);
  expect(screen.getByRole('heading', { name: 'Familia' })).toBeVisible();
  expect(screen.getByText('En espera')).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('Esperando a que Rosa haga el sorteo');
  expect(screen.getByText('Bs 200')).toBeVisible();
  expect(screen.getByText('Enero 2027')).toBeVisible();
  expect(screen.getByText('ABC123')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Compartir link' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Sortear orden' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Más acciones/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Eliminar a/ })).not.toBeInTheDocument();
  const people = screen.getByRole('list', { name: 'Participantes (2/30)' });
  const memberRow = within(people).getByText('Lucía').closest('li');
  const hostRow = within(people).getByText('Rosa').closest('li');
  expect(within(memberRow).getByText('Tú')).toBeVisible();
  expect(within(memberRow).queryByText('Anfitrión')).not.toBeInTheDocument();
  expect(within(hostRow).getByText('Anfitrión')).toBeVisible();
});

it('reconoce al anfitrión por user_id aunque su participación no sea la primera', () => {
  const onDraw = vi.fn(), onRemoveParticipant = vi.fn(), onCancelRoom = vi.fn();
  render(<Lobby room={room} participants={[member, host]} userId={host.user_id} onDraw={onDraw} onRemoveParticipant={onRemoveParticipant} onCancelRoom={onCancelRoom} />);
  expect(screen.queryByText(/Esperando a que/)).not.toBeInTheDocument();
  const button = screen.getByRole('button', { name: 'Sortear orden' });
  expect(button).toBeEnabled();
  fireEvent.click(button);
  expect(onDraw).toHaveBeenCalledExactlyOnceWith();
  expect(screen.queryByRole('button', { name: 'Eliminar a Rosa' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar a Lucía' }));
  expect(onRemoveParticipant).toHaveBeenCalledExactlyOnceWith(member);
  fireEvent.click(screen.getByRole('button', { name: 'Más acciones de la sala' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Cancelar sala' }));
  expect(onCancelRoom).toHaveBeenCalledExactlyOnceWith();
});

it('con menos de dos invita a compartir y explica por qué no puede sortear', () => {
  const onDraw = vi.fn();
  render(<Lobby room={room} participants={[host]} userId={host.user_id} onDraw={onDraw} />);
  expect(screen.getByRole('heading', { name: 'Participantes (1/30)' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Todavía no entra nadie' })).toBeVisible();
  expect(screen.getByText(/Comparte el código/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Copiar código' })).toBeEnabled();
  const button = screen.getByRole('button', { name: 'Sortear orden' });
  expect(button).toBeDisabled();
  expect(button).toHaveAccessibleDescription('Necesitas al menos 2 participantes para sortear.');
  fireEvent.click(button);
  expect(onDraw).not.toHaveBeenCalled();
});

it('sin implementación de sorteo lo deshabilita y explica la siguiente etapa', () => {
  render(<Lobby room={room} participants={[host, member]} userId={host.user_id} />);
  expect(screen.getByRole('button', { name: 'Sortear orden' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Sortear orden' })).toHaveAccessibleDescription('El sorteo estará disponible pronto.');
});

it('busy bloquea todas las acciones de gestión y no llama sus callbacks', () => {
  const onDraw = vi.fn(), onRemoveParticipant = vi.fn(), onCancelRoom = vi.fn();
  render(<Lobby room={room} participants={[host, member]} userId={host.user_id} busy onDraw={onDraw} onRemoveParticipant={onRemoveParticipant} onCancelRoom={onCancelRoom} />);
  expect(screen.getByRole('button', { name: 'Sortear orden' })).toBeDisabled();
  const remove = screen.getByRole('button', { name: 'Eliminar a Lucía' });
  expect(remove).toBeDisabled();
  fireEvent.click(remove);
  fireEvent.click(screen.getByRole('button', { name: 'Más acciones de la sala' }));
  const cancel = screen.getByRole('menuitem', { name: 'Cancelar sala' });
  expect(cancel).toBeDisabled();
  fireEvent.click(cancel);
  expect(onDraw).not.toHaveBeenCalled();
  expect(onRemoveParticipant).not.toHaveBeenCalled();
  expect(onCancelRoom).not.toHaveBeenCalled();
});

it('actualiza cantidad y acciones al llegar o irse personas, sin modificar la lista recibida', () => {
  const participants = Object.freeze([Object.freeze(host)]);
  const props = { room, userId: host.user_id, onDraw: vi.fn() };
  const { rerender } = render(<Lobby {...props} participants={participants} />);
  rerender(<Lobby {...props} participants={[host, member]} newParticipantIds={[member.id]} />);
  expect(screen.getByRole('heading', { name: 'Participantes (2/30)' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Sortear orden' })).toBeEnabled();
  expect(screen.getByText('Acaba de entrar')).toBeVisible();
  expect(screen.getByRole('list', { name: 'Participantes (2/30)' })).toHaveAttribute('aria-live', 'polite');
  rerender(<Lobby {...props} participants={participants} />);
  expect(screen.queryByText('Lucía')).not.toBeInTheDocument();
  expect(screen.queryByText('Acaba de entrar')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sortear orden' })).toBeDisabled();
  expect(participants).toEqual([host]);
});
