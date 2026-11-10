import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureSession, linkGoogle, onAuthChange } from './authApi';
import { AppError } from '../../../shared/errors/appError';

const { auth } = vi.hoisted(() => ({ auth: {
  getSession: vi.fn(), signInAnonymously: vi.fn(), linkIdentity: vi.fn(), onAuthStateChange: vi.fn(),
} }));
vi.mock('../../../shared/lib/supabase', () => ({ supabase: { auth } }));
const session = { user: { id: 'user-1', is_anonymous: true } };

describe('API de identidad', () => {
  beforeEach(() => vi.resetAllMocks());
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
