import { render, screen, within } from '@testing-library/react';
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

