import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import AuthProvider from './AuthProvider';
import { useAuth } from '../features/auth/hooks/useAuth';
import { AppError } from '../shared/errors/appError';

const { api } = vi.hoisted(() => ({ api: { ensureSession: vi.fn(), onAuthChange: vi.fn() } }));
vi.mock('../features/auth/api/authApi', () => api);
vi.mock('../features/profile/api/profileApi', () => ({ getProfile: async () => ({ data: null }), saveDisplayName: vi.fn() }));
let listener; const stop = vi.fn();
const anon = { user: { id: 'one', is_anonymous: true } };
function Consumer() {
  const { user, isAnonymous, status, error, retry } = useAuth();
  return <><output>{status}:{user?.id}:{String(isAnonymous)}:{error?.code}</output><button onClick={retry}>Reintentar</button></>;
}
beforeEach(() => {
  vi.resetAllMocks();
  api.onAuthChange.mockImplementation(callback => { listener = callback; return stop; });
});
it('expone carga y luego la identidad existente en StrictMode', async () => {
  let resolve; api.ensureSession.mockImplementation(() => new Promise(r => { resolve = r; }));
  const view = render(<StrictMode><AuthProvider><Consumer /></AuthProvider></StrictMode>);
  expect(screen.getByRole('status')).toHaveTextContent('loading:');
  await act(async () => resolve({ data: anon }));
  expect(screen.getByRole('status')).toHaveTextContent('ready:one:true:');
  view.unmount(); expect(stop).toHaveBeenCalledTimes(2);
});
it('bloquea con error y permite reintentar la sesión', async () => {
  api.ensureSession.mockRejectedValueOnce(new AppError('AUTH_FAILED')).mockResolvedValueOnce({ data: anon });
  render(<AuthProvider><Consumer /></AuthProvider>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('error::false:AUTH_FAILED'));
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ready:one:true:'));
});
it('un cambio más reciente de Auth gana a una respuesta inicial tardía', async () => {
  let resolve; api.ensureSession.mockImplementation(() => new Promise(r => { resolve = r; }));
  render(<AuthProvider><Consumer /></AuthProvider>);
  act(() => listener('USER_UPDATED', { user: { id: 'one', is_anonymous: false, email: 'a@example.test' } }));
  await act(async () => resolve({ data: anon }));
  expect(screen.getByRole('status')).toHaveTextContent('ready:one:false:');
});
it('no carga el perfil de INITIAL_SESSION hasta verificar que el usuario sigue existiendo', async () => {
  let resolve; api.ensureSession.mockImplementation(() => new Promise(done => { resolve = done; }));
  render(<AuthProvider><Consumer /></AuthProvider>);
  act(() => listener('INITIAL_SESSION', { user: { id: 'deleted-user', is_anonymous: false, email: 'old@example.test' } }));
  expect(screen.getByRole('status')).toHaveTextContent('loading:');
  expect(screen.getByRole('status')).not.toHaveTextContent('deleted-user');
  await act(async () => resolve({ data: anon }));
  expect(screen.getByRole('status')).toHaveTextContent('ready:one:true:');
});
