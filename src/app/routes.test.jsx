import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import AppRoutes from './routes';
vi.mock('./IdentityBoundary', async () => { const { Outlet } = await import('react-router-dom'); return { default: () => <Outlet /> }; });
vi.mock('../pages/HomePage', async () => { const { Link } = await import('react-router-dom'); return { default: () => <Link to="/new">Crear sala</Link> }; });
vi.mock('../features/rooms/ui/CreateRoomFlow', () => ({ default: ({ onBack }) => <><h1>Formulario crear</h1><button onClick={onBack}>Volver</button></> }));
vi.mock('../features/rooms/ui/JoinRoomSearch', () => ({ default: () => <h1>Formulario código</h1> }));
vi.mock('../pages/RoomPage', () => ({ default: () => <h1>Sala</h1> }));
it.each([['/new', 'Formulario crear'], ['/join', 'Formulario código'], ['/room/ABC123', 'Sala']])('abre %s directamente', async (path, heading) => {
  render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
});
it('navega crear y vuelve al inicio mediante el router', async () => {
  render(<MemoryRouter><AppRoutes /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('link', { name: 'Crear sala' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Volver' }));
  expect(await screen.findByRole('link', { name: 'Crear sala' })).toBeInTheDocument();
});
it.each(['/room', '/link-incompleto'])('ofrece una salida útil en %s', async path => {
  render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'No encontramos esta sala' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Escribir un código' }));
  expect(await screen.findByRole('heading', { name: 'Formulario código' })).toBeInTheDocument();
});
