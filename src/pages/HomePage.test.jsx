import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import HomePage from './HomePage';
import { AuthContext } from '../app/authContext';
const { listMyRooms } = vi.hoisted(() => ({ listMyRooms: vi.fn() }));
vi.mock('../features/rooms/api/roomsApi', () => ({ listMyRooms }));
vi.mock('../features/auth/api/authApi', () => ({ linkGoogle: vi.fn() }));
vi.mock('../features/profile/api/profileApi', () => ({ saveDisplayName: vi.fn(), getProfile: vi.fn() }));
const auth = { user: { id: 'home-user', is_anonymous: true }, isAnonymous: true,
  profileState: { profile: { display_name: 'Lucía' }, status: 'ready' } };
function show() { return render(<MemoryRouter><AuthContext.Provider value={auth}><HomePage /></AuthContext.Provider></MemoryRouter>); }
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); });
it('muestra saludo, enlaces y salas con código, conteo, rol y estado', async () => {
  listMyRooms.mockResolvedValue({ data: [
    { id: 'a', code: 'ABC123', name: 'Familia', participant_count: 8, is_host: true, status: 'waiting' },
    { id: 'b', code: 'DEF456', name: 'Oficina', participant_count: 3, is_host: false, status: 'drawn' },
  ] });
  show();
  expect(screen.getByRole('heading', { name: 'Hola, Lucía' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Crear sala' })).toHaveAttribute('href', '/new');
  expect(screen.getByRole('link', { name: 'Unirme con código' })).toHaveAttribute('href', '/join');
  const room = await screen.findByRole('link', { name: /Familia/ });
  expect(room).toHaveAttribute('href', '/room/ABC123');
  expect(room).toHaveTextContent('ABC123'); expect(room).toHaveTextContent('8 participantes');
  expect(room).toHaveTextContent('Anfitrión'); expect(room).toHaveTextContent('En espera');
  expect(screen.getByRole('link', { name: /Oficina/ })).toHaveTextContent('Sorteada');
  expect(screen.getByRole('link', { name: /Oficina/ })).toHaveTextContent('Participante');
});
it('muestra estado vacío y cancelación cerrable sin listar la sala cancelada', async () => {
  listMyRooms.mockResolvedValue({ data: [{ id: 'home-cancel', name: 'Amigas', host_name: 'Rosa', status: 'cancelled' }] });
  show();
  expect(await screen.findByText('Aún no tienes salas')).toBeVisible();
  expect(screen.getByText('Rosa canceló la sala “Amigas”. Ya no aparece en tus salas.')).toBeVisible();
  expect(screen.queryByRole('link', { name: /Amigas/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
  await waitFor(() => expect(screen.queryByText(/Rosa canceló/)).not.toBeInTheDocument());
});
