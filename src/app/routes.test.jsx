import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import AppRoutes from './routes';
vi.mock('./IdentityBoundary', async () => { const { Outlet } = await import('react-router-dom'); return { default: () => <Outlet /> }; });
vi.mock('../pages/HomePage', async () => { const { Link } = await import('react-router-dom'); return { default: () => <Link to="/new">Crear sala</Link> }; });
vi.mock('../components/CreateRoomForm', () => ({ default: ({ onBack }) => <><h1>Formulario crear</h1><button onClick={onBack}>Volver</button></> }));
vi.mock('../components/JoinRoomForm', () => ({ default: () => <h1>Formulario código</h1> }));
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
