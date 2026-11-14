import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureSession, linkGoogle, onAuthChange } from './authApi';
import { AppError } from '../../../shared/errors/appError';

const { auth } = vi.hoisted(() => ({ auth: {
  getSession: vi.fn(), getUser: vi.fn(), signOut: vi.fn(), signInAnonymously: vi.fn(), linkIdentity: vi.fn(), onAuthStateChange: vi.fn(),
} }));
vi.mock('../../../shared/lib/supabase', () => ({ supabase: { auth } }));
const session = { access_token: 'old-access', refresh_token: 'old-refresh', user: { id: 'user-1', is_anonymous: true } };
const fresh = { access_token: 'new-access', refresh_token: 'new-refresh', user: { id: 'new-guest', is_anonymous: true } };

describe('API de identidad', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.getUser.mockResolvedValue({ data: { user: session.user }, error: null });
    auth.signOut.mockResolvedValue({ error: null });
  });
  it('reemplaza una sesión de usuario eliminado por un invitado válido', async () => {
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.getUser.mockResolvedValue({ data: { user: null }, error: { code: 'user_not_found', status: 403 } });
    auth.signInAnonymously.mockResolvedValue({ data: { session: fresh }, error: null });
    expect(await ensureSession()).toEqual({ data: fresh });
    expect(auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
  });
  it.each([{ name: 'AuthRetryableFetchError', status: 0 }, { code: 'unexpected_failure', status: 500 }, { code: 'over_request_rate_limit', status: 429 }])('no pierde la sesión ni crea un invitado ante un error transitorio %j', async error => {
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.getUser.mockResolvedValue({ data: { user: null }, error });
    await expect(ensureSession()).rejects.toMatchObject({ code: 'AUTH_FAILED' });
    expect(auth.signOut).not.toHaveBeenCalled(); expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });
  it('no cierra una cuenta que cambió mientras se comprobaba el usuario eliminado', async () => {
    auth.getSession.mockResolvedValueOnce({ data: { session }, error: null })
      .mockResolvedValue({ data: { session: fresh }, error: null });
    auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { code: 'user_not_found' } })
      .mockResolvedValue({ data: { user: fresh.user }, error: null });
    expect(await ensureSession()).toEqual({ data: fresh });
    expect(auth.signOut).not.toHaveBeenCalled(); expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });
  it('recupera un refresh token eliminado y comparte la recuperación concurrente', async () => {
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: { code: 'refresh_token_not_found' } })
      .mockResolvedValue({ data: { session: null }, error: null });
    auth.signInAnonymously.mockResolvedValue({ data: { session: fresh }, error: null });
    expect(await Promise.all([ensureSession(), ensureSession()])).toEqual([{ data: fresh }, { data: fresh }]);
    expect(auth.signInAnonymously).toHaveBeenCalledOnce();
  });
  it('reutiliza una sesión existente, también si está vinculada', async () => {
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    expect(await ensureSession()).toEqual({ data: session });
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });
  it('comparte el inicio anónimo en llamadas concurrentes, sin conservar una sesión en caché', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    auth.signInAnonymously.mockResolvedValue({ data: { session }, error: null });
    expect(await Promise.all([ensureSession(), ensureSession()])).toEqual([{ data: session }, { data: session }]);
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    await ensureSession();
    expect(auth.getSession).toHaveBeenCalledTimes(2);
  });
  it('traduce fallos de sesión y permite volver a intentar', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    auth.signInAnonymously.mockResolvedValueOnce({ error: new Error('technical') })
      .mockResolvedValueOnce({ data: { session }, error: null });
    await expect(ensureSession()).rejects.toMatchObject({ code: 'AUTH_FAILED' });
    expect(await ensureSession()).toEqual({ data: session });
  });
  it('no crea otra cuenta cuando falla la lectura de la sesión', async () => {
    auth.getSession.mockRejectedValue(new Error('offline'));
    await expect(ensureSession()).rejects.toBeInstanceOf(AppError);
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });
  it('vincula Google con retorno al inicio, sin reemplazar ni cerrar la sesión', async () => {
    auth.linkIdentity.mockResolvedValue({ data: { provider: 'google', url: 'https://example.test/oauth' }, error: null });
    expect((await linkGoogle()).data.provider).toBe('google');
    expect(auth.linkIdentity).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/` } });
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });
  it('convierte el fallo o cancelación de Google en un error propio', async () => {
    auth.linkIdentity.mockResolvedValue({ error: { message: 'access_denied' } });
    await expect(linkGoogle()).rejects.toMatchObject({ code: 'AUTH_LINK_FAILED' });
  });
  it('distingue una identidad ya registrada de un fallo genérico al guardar con Google', async () => {
    auth.linkIdentity.mockResolvedValue({ error: { code: 'identity_already_exists' } });
    await expect(linkGoogle()).rejects.toMatchObject({ code: 'AUTH_IDENTITY_EXISTS' });
  });
  it('propaga los cambios de sesión y libera la suscripción', () => {
    const unsubscribe = vi.fn(); const listener = vi.fn();
    auth.onAuthStateChange.mockImplementation(callback => {
      callback('USER_UPDATED', session);
      return { data: { subscription: { unsubscribe } } };
    });
    const stop = onAuthChange(listener);
    expect(listener).toHaveBeenCalledWith('USER_UPDATED', session);
    stop(); expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
