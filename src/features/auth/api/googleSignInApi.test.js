import { beforeEach, expect, it, vi } from 'vitest';
import { startGoogleSignIn, finishGoogleSignIn, cancelGoogleSignIn, signOutLocal } from './googleSignInApi';

const { primary, temporary, createGoogleSignInClient, hasRoomMembership } = vi.hoisted(() => ({
  primary: { getUser: vi.fn(), setSession: vi.fn(), signOut: vi.fn() },
  temporary: { signInWithOAuth: vi.fn(), exchangeCodeForSession: vi.fn(), getSession: vi.fn(), getUser: vi.fn(), stopAutoRefresh: vi.fn() },
  createGoogleSignInClient: vi.fn(), hasRoomMembership: vi.fn(),
}));
vi.mock('../../../shared/lib/supabase', () => ({ supabase: { auth: primary }, createGoogleSignInClient }));
vi.mock('../../rooms/api/membershipApi', () => ({ hasRoomMembership }));
const guest = { id: 'guest', is_anonymous: true };
const google = { id: 'google', is_anonymous: false, identities: [{ provider: 'google' }] };
const session = { user: google, access_token: 'test-access', refresh_token: 'test-refresh' };

beforeEach(() => {
  vi.restoreAllMocks(); vi.resetAllMocks(); sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  primary.getUser.mockResolvedValue({ data: { user: guest }, error: null });
  primary.setSession.mockResolvedValue({ data: { session }, error: null });
  primary.signOut.mockResolvedValue({ error: null });
  createGoogleSignInClient.mockReturnValue({ auth: temporary });
  hasRoomMembership.mockResolvedValue(false);
  temporary.signInWithOAuth.mockResolvedValue({ data: { url: 'https://example.test/oauth' }, error: null });
  temporary.getSession.mockResolvedValue({ data: { session: null }, error: null });
  temporary.exchangeCodeForSession.mockResolvedValue({ data: { session }, error: null });
  temporary.getUser.mockResolvedValue({ data: { user: google }, error: null });
});
async function callback() {
  await startGoogleSignIn();
  window.history.replaceState(null, '', '/auth/google?code=test-code&sb_flow_id=test-flow');
}
it('abre Google en una sesión separada sin sustituir al invitado', async () => {
  await startGoogleSignIn();
  expect(temporary.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/google` } });
  expect(primary.setSession).not.toHaveBeenCalled();
  expect(primary.signOut).not.toHaveBeenCalled();
});
it('bloquea el acceso existente si el invitado participa en cualquier sala', async () => {
  hasRoomMembership.mockResolvedValue(true);
  await expect(startGoogleSignIn()).rejects.toMatchObject({ code: 'GUEST_HAS_ROOMS' });
  expect(temporary.signInWithOAuth).not.toHaveBeenCalled();
});
it('no redirige cuando sessionStorage está bloqueado', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  await expect(startGoogleSignIn()).rejects.toMatchObject({ code: 'AUTH_STORAGE_UNAVAILABLE' });
  expect(temporary.signInWithOAuth).not.toHaveBeenCalled();
});
it('mantiene al invitado si Google falla al abrir', async () => {
  temporary.signInWithOAuth.mockResolvedValue({ error: new Error('offline') });
  await expect(startGoogleSignIn()).rejects.toMatchObject({ code: 'AUTH_SIGN_IN_FAILED' });
  expect(primary.setSession).not.toHaveBeenCalled();
});
it('valida Google y las salas de nuevo antes de activar la cuenta, una vez en StrictMode', async () => {
  await callback();
  await Promise.all([finishGoogleSignIn(), finishGoogleSignIn()]);
  expect(temporary.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  expect(temporary.getUser).toHaveBeenCalledTimes(1);
  expect(hasRoomMembership).toHaveBeenCalledTimes(2);
  expect(primary.setSession).toHaveBeenCalledExactlyOnceWith({ access_token: 'test-access', refresh_token: 'test-refresh' });
  expect(primary.signOut).not.toHaveBeenCalled();
  expect(sessionStorage.length).toBe(0);
  expect(window.location.search).toBe('');
});
it('bloquea el retorno si apareció una sala durante OAuth', async () => {
  await callback(); hasRoomMembership.mockResolvedValue(true);
  await expect(finishGoogleSignIn()).rejects.toMatchObject({ code: 'GUEST_HAS_ROOMS' });
  expect(primary.setSession).not.toHaveBeenCalled();
});
it('bloquea el retorno si otra pestaña cambió la identidad', async () => {
  await callback(); primary.getUser.mockResolvedValue({ data: { user: { ...guest, id: 'another' } }, error: null });
  await expect(finishGoogleSignIn()).rejects.toMatchObject({ code: 'AUTH_SESSION_CHANGED' });
  expect(primary.setSession).not.toHaveBeenCalled();
});
it('no promueve un usuario que el servidor no pudo validar', async () => {
  await callback(); temporary.getUser.mockResolvedValue({ data: { user: null }, error: new Error('offline') });
  await expect(finishGoogleSignIn()).rejects.toMatchObject({ code: 'AUTH_SIGN_IN_FAILED' });
  expect(primary.setSession).not.toHaveBeenCalled();
});
it('cancelar Google conserva la sesión primaria y elimina parámetros de OAuth', async () => {
  await callback(); window.history.replaceState(null, '', '/auth/google?error=access_denied#hidden');
  await expect(finishGoogleSignIn()).rejects.toMatchObject({ code: 'AUTH_SIGN_IN_FAILED' });
  expect(primary.setSession).not.toHaveBeenCalled(); expect(primary.signOut).not.toHaveBeenCalled();
  expect(window.location.search).toBe(''); expect(window.location.hash).toBe('');
});
it('rechaza un callback sin flujo iniciado en este navegador', async () => {
  await expect(finishGoogleSignIn()).rejects.toMatchObject({ code: 'AUTH_SIGN_IN_FAILED' });
  expect(primary.setSession).not.toHaveBeenCalled();
});
it('permite reintentar la validación sin canjear el código otra vez', async () => {
  await callback();
  temporary.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('offline') });
  await expect(finishGoogleSignIn()).rejects.toMatchObject({ code: 'AUTH_SIGN_IN_FAILED' });
  temporary.getSession.mockResolvedValue({ data: { session }, error: null });
  await finishGoogleSignIn();
  expect(temporary.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  expect(primary.setSession).toHaveBeenCalledTimes(1);
});
it('cerrar sesión solo afecta a este dispositivo', async () => {
  primary.getUser.mockResolvedValue({ data: { user: google }, error: null });
  await signOutLocal();
  expect(primary.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
});
it('rechaza un intento vencido sin cambiar de cuenta', async () => {
  await callback(); vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60 * 1000);
  await expect(finishGoogleSignIn()).rejects.toMatchObject({ code: 'AUTH_SIGN_IN_FAILED' });
  expect(primary.setSession).not.toHaveBeenCalled();
});
it('no cambia de identidad si falla comprobar las participaciones al volver', async () => {
  await callback(); hasRoomMembership.mockRejectedValue(new Error('offline'));
  await expect(finishGoogleSignIn()).rejects.toMatchObject({ code: 'AUTH_SIGN_IN_FAILED' });
  expect(primary.setSession).not.toHaveBeenCalled();
});
it('detecta una cuenta vinculada en otra pestaña mientras consulta las salas', async () => {
  await callback();
  primary.getUser.mockResolvedValueOnce({ data: { user: guest }, error: null })
    .mockResolvedValueOnce({ data: { user: { ...guest, is_anonymous: false } }, error: null });
  await expect(finishGoogleSignIn()).rejects.toMatchObject({ code: 'AUTH_SESSION_CHANGED' });
  expect(primary.setSession).not.toHaveBeenCalled();
});
it('traduce un fallo de cierre sin crear otra sesión', async () => {
  primary.getUser.mockResolvedValue({ data: { user: google }, error: null });
  primary.signOut.mockResolvedValue({ error: new Error('offline') });
  await expect(signOutLocal()).rejects.toMatchObject({ code: 'AUTH_SIGN_OUT_FAILED' });
});
it('no ofrece un reinicio destructivo de la sesión invitada', async () => {
  await expect(signOutLocal()).rejects.toMatchObject({ code: 'AUTH_SIGN_OUT_FAILED' });
  expect(primary.signOut).not.toHaveBeenCalled();
});
it('cancelar durante la validación impide activar Google aunque llegue la respuesta', async () => {
  await callback();
  let resolve;
  temporary.getUser.mockImplementation(() => new Promise(done => { resolve = done; }));
  const result = finishGoogleSignIn();
  await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
  cancelGoogleSignIn(); resolve({ data: { user: google }, error: null });
  await expect(result).rejects.toMatchObject({ code: 'AUTH_SESSION_CHANGED' });
  expect(primary.setSession).not.toHaveBeenCalled();
});
it('cancelar durante la preparación impide abrir Google', async () => {
  let resolve;
  hasRoomMembership.mockImplementation(() => new Promise(done => { resolve = done; }));
  const result = startGoogleSignIn();
  await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
  cancelGoogleSignIn(); resolve(false);
  await expect(result).rejects.toMatchObject({ code: 'AUTH_SESSION_CHANGED' });
  expect(temporary.signInWithOAuth).not.toHaveBeenCalled();
});
