import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../../app/authContext';
import { useMyRooms } from '../hooks/useMyRooms';
import { CancelledRoom, RemovedRoom, CancellationArrivalNotice } from './RoomStateViews';
const room = { id: 'r', name: 'Familia', host_name: 'Rosa' };
const { listMyRooms } = vi.hoisted(() => ({ listMyRooms: vi.fn() }));
vi.mock('../api/roomsApi', () => ({ listMyRooms }));
function HomeNotices() {
  const { notices, status } = useMyRooms();
  return <p>{status}: {notices.length} avisos en lista</p>;
}
it('no duplica el aviso de llegada en la consulta de Tus salas', async () => {
  listMyRooms.mockResolvedValue({ data: [{ ...room, id: 'arrival', status: 'cancelled' }] });
  render(<AuthContext.Provider value={{ user: { id: 'arrival-user' } }}><MemoryRouter initialEntries={[{ pathname: '/', state: { roomNotice: { type: 'cancelled', room: { ...room, id: 'arrival' } } } }]}><CancellationArrivalNotice /><HomeNotices /></MemoryRouter></AuthContext.Provider>);
  expect(await screen.findByText('ready: 0 avisos en lista')).toBeInTheDocument();
  expect(screen.getAllByRole('status')).toHaveLength(1);
});
it('informa quién canceló la sala y ofrece ir al inicio', () => {
  const onHome = vi.fn();
  render(<CancelledRoom room={room} onHome={onHome} />);
  expect(screen.getByRole('heading', { name: 'Rosa canceló la sala' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ir al inicio' }));
  expect(onHome).toHaveBeenCalledOnce();
});
it('explica la eliminación y permite volver al inicio sin exponer gestión', () => {
  const onHome = vi.fn();
  render(<RemovedRoom room={room} onHome={onHome} />);
  expect(screen.getByRole('heading', { name: 'Ya no estás en esta sala' })).toBeInTheDocument();
  expect(screen.getByText(/Rosa te quitó de/)).toHaveTextContent('Familia');
  fireEvent.click(screen.getByRole('button', { name: 'Ir al inicio' }));
  expect(onHome).toHaveBeenCalledOnce();
});
it('mantiene el aviso de llegada hasta cerrarlo explícitamente', () => {
  render(<AuthContext.Provider value={{ user: { id: 'persistent-user' } }}><MemoryRouter initialEntries={[{ pathname: '/', state: { roomNotice: { type: 'cancelled', room } } }]}><CancellationArrivalNotice /></MemoryRouter></AuthContext.Provider>);
  expect(screen.getByRole('status')).toHaveTextContent('Rosa canceló la sala “Familia”');
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
