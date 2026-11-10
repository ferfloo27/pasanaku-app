import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import GoogleAccount from '../ui/GoogleAccount';
import { AuthContext } from '../../../app/authContext';
import { AppError } from '../../../shared/errors/appError';
const { linkGoogle } = vi.hoisted(() => ({ linkGoogle: vi.fn() }));
vi.mock('../api/authApi', () => ({ linkGoogle }));
const anon = { id: 'one', is_anonymous: true };
const context = user => ({ user, isAnonymous: user.is_anonymous, profileState: { profile: { user_id: 'one', display_name: 'Rosa' } } });
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); window.history.replaceState(null, '', '/'); });
afterEach(() => vi.restoreAllMocks());
it('inicia la vinculación, muestra carga y conserva la identidad ante un fallo inmediato', async () => {
  let reject; linkGoogle.mockImplementation(() => new Promise((_, r) => { reject = r; }));
  render(<AuthContext.Provider value={context(anon)}><GoogleAccount /></AuthContext.Provider>);
  fireEvent.click(screen.getByRole('button', { name: 'Vincular cuenta de Google' }));
  expect(screen.getByRole('button', { name: 'Vinculando…' })).toBeDisabled();
  await act(async () => reject(new AppError('AUTH_LINK_FAILED')));
  expect(screen.getByRole('alert')).toHaveTextContent('Tu sesión sigue aquí');
  expect(screen.getByRole('button', { name: 'Vincular cuenta de Google' })).toBeEnabled();
});
it('muestra cancelación al volver de Google y limpia solo los parámetros de error', async () => {
  window.history.replaceState(null, '', '/?keep=1#error=access_denied&error_description=technical');
  render(<AuthContext.Provider value={context(anon)}><GoogleAccount /></AuthContext.Provider>);
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No se vinculó Google'));
  expect(window.location.search).toBe('?keep=1'); expect(window.location.hash).toBe('');
  expect(linkGoogle).not.toHaveBeenCalled();
});
it('detecta volver atrás desde Google con la misma página conservada', async () => {
  linkGoogle.mockResolvedValue({ data: { provider: 'google', url: 'https://example.test/oauth' } });
  render(<AuthContext.Provider value={context(anon)}><GoogleAccount /></AuthContext.Provider>);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Vincular cuenta de Google' })));
  expect(screen.getByRole('button', { name: 'Vinculando…' })).toBeDisabled();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  act(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Vincular cuenta de Google' })).toBeEnabled();
});
it('tras vincular muestra el correo y conserva el nombre del perfil', () => {
  const { rerender } = render(<AuthContext.Provider value={context(anon)}><GoogleAccount /></AuthContext.Provider>);
  const linked = { ...anon, is_anonymous: false, email: 'lucia@example.test', user_metadata: { full_name: 'Lucía Google' } };
  const auth = context(linked);
  rerender(<AuthContext.Provider value={auth}><GoogleAccount /></AuthContext.Provider>);
  expect(screen.getByText('Cuenta vinculada: lucia@example.test')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Vincular cuenta de Google' })).not.toBeInTheDocument();
  expect(auth.profileState.profile.display_name).toBe('Rosa');
});
it('volver atrás desbloquea el botón incluso si el navegador bloquea sessionStorage', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
  linkGoogle.mockResolvedValue({ data: { provider: 'google', url: 'https://example.test/oauth' } });
  render(<AuthContext.Provider value={context(anon)}><GoogleAccount /></AuthContext.Provider>);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Vincular cuenta de Google' })));
  expect(screen.getByRole('button', { name: 'Vinculando…' })).toBeDisabled();
  act(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Vincular cuenta de Google' })).toBeEnabled());
  expect(screen.getByRole('alert')).toHaveTextContent('Tu sesión sigue aquí');
});
