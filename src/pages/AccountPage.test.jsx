import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import AccountPage from './AccountPage';
import HomePage from './HomePage';
import { RequireProfile } from '../app/guards';
import { AuthContext } from '../app/authContext';
import { AppError } from '../shared/errors/appError';
const { startGoogleSignIn, signOutLocal, linkGoogle, save } = vi.hoisted(() => ({
  startGoogleSignIn: vi.fn(), signOutLocal: vi.fn(), linkGoogle: vi.fn(), save: vi.fn(),
}));
vi.mock('../features/auth/api/googleSignInApi', () => ({ startGoogleSignIn, signOutLocal, cancelGoogleSignIn: vi.fn() }));
vi.mock('../features/auth/api/authApi', () => ({ linkGoogle }));
vi.mock('../features/rooms/api/roomsApi', () => ({ listMyRooms: async () => ({ data: [] }) }));
const guest = { id: 'guest', is_anonymous: true };
const google = { id: 'google', is_anonymous: false, email: 'rosa@example.test' };
function show(user = guest, profile = { user_id: user.id, display_name: 'Rosa Mamani' }, child = <AccountPage />) {
  return render(<MemoryRouter><AuthContext.Provider value={{ user, isAnonymous: user.is_anonymous,
    profileState: { profile, status: 'ready', save, isSaving: false } }}>
    {child}</AuthContext.Provider></MemoryRouter>);
}
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); });
it('muestra avatar como acceso a Cuenta desde Inicio', async () => {
  show(guest, undefined, <HomePage />);
  expect(screen.getByRole('link', { name: 'Mi cuenta' })).toHaveAttribute('href', '/account');
  await screen.findByText('Aún no tienes salas');
});
it('el invitado puede editar su nombre y distingue acceso de vinculación', async () => {
  show();
  expect(screen.getByRole('heading', { name: 'Cuenta y ajustes' })).toBeVisible();
  expect(screen.getByText('Invitado')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Editar tu nombre' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Tu nombre' }), { target: { value: 'Lucía' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('Lucía'));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Ya tengo cuenta: entrar con Google' })));
  expect(startGoogleSignIn).toHaveBeenCalledOnce(); expect(linkGoogle).not.toHaveBeenCalled();
});
it('con Google el correo es de solo lectura y se puede cerrar sesión local', async () => {
  show(google);
  expect(screen.getByText('Cuenta de Google')).toBeVisible();
  expect(screen.getByText('rosa@example.test', { exact: true })).toBeVisible();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /entrar con Google/ })).not.toBeInTheDocument();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' })));
  expect(signOutLocal).toHaveBeenCalledOnce();
});
it('un fallo de cierre conserva los datos visibles y permite reintentar', async () => {
  signOutLocal.mockRejectedValue(new AppError('AUTH_SIGN_OUT_FAILED')); show(google);
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cerrar tu sesión');
  expect(screen.getByRole('heading', { name: 'Rosa Mamani' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled();
});
it('ofrece acceso Google antes de guardar el nombre, sin escribir perfil', async () => {
  show(guest, null, <RequireProfile><p>Inicio</p></RequireProfile>);
  fireEvent.click(screen.getByRole('button', { name: 'Ya tengo cuenta: entrar con Google' }));
  await waitFor(() => expect(startGoogleSignIn).toHaveBeenCalledOnce());
  expect(save).not.toHaveBeenCalled(); expect(screen.getByRole('dialog')).toBeVisible();
});
it('explica el bloqueo de invitados con salas y permite continuar usando su cuenta', async () => {
  startGoogleSignIn.mockRejectedValue(new AppError('GUEST_HAS_ROOMS')); show();
  fireEvent.click(screen.getByRole('button', { name: 'Ya tengo cuenta: entrar con Google' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Este invitado ya tiene salas');
  expect(screen.getByRole('button', { name: 'Vincular cuenta de Google' })).toBeEnabled();
});
