import { afterEach, expect, it, vi } from 'vitest';
const { createClient } = vi.hoisted(() => ({ createClient: vi.fn(() => ({})) }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); createClient.mockClear(); window.history.replaceState(null, '', '/'); });
async function load(path) {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-public-key');
  window.history.replaceState(null, '', path);
  return import('./supabase');
}
it('el cliente principal ignora el callback de acceso sin desactivar el retorno de vinculación', async () => {
  await load('/auth/google?code=example');
  expect(createClient.mock.calls[0][2].auth.detectSessionInUrl).toBe(false);
  vi.resetModules(); createClient.mockClear(); await load('/');
  expect(createClient.mock.calls[0][2].auth.detectSessionInUrl).toBe(true);
});
it('aísla el PKCE temporal con almacenamiento de pestaña y sin renovar sesiones', async () => {
  const { createGoogleSignInClient } = await load('/');
  createGoogleSignInClient('unique-flow');
  expect(createClient.mock.calls[1][2].auth).toEqual({
    storageKey: 'unique-flow', storage: sessionStorage, flowType: 'pkce',
    persistSession: true, autoRefreshToken: false, detectSessionInUrl: false,
  });
});
it('cancelar impide la escritura tardía del SDK y conserva la sesión guardada', async () => {
  const { withAuthStorageGuard } = await load('/');
  const { storage, storageKey } = createClient.mock.calls[0][2].auth;
  storage.setItem(storageKey, 'guest-session');
  let cancelled = false;
  await expect(withAuthStorageGuard(() => { if (cancelled) throw new Error('cancelled'); }, async () => {
    cancelled = true;
    storage.setItem(storageKey, 'google-session');
  })).rejects.toThrow('cancelled');
  expect(storage.getItem(storageKey)).toBe('guest-session');
  storage.setItem(storageKey, 'later-session');
  expect(storage.getItem(storageKey)).toBe('later-session');
  storage.removeItem(storageKey);
});
it('no sobreescribe una sesión actualizada por otra pestaña durante la validación', async () => {
  const { withAuthStorageGuard } = await load('/');
  const { storage, storageKey } = createClient.mock.calls[0][2].auth;
  storage.setItem(storageKey, 'guest-session');
  await expect(withAuthStorageGuard(() => {}, async () => {
    localStorage.setItem(storageKey, 'other-tab-session');
    storage.setItem(storageKey, 'google-session');
  })).rejects.toThrow();
  expect(storage.getItem(storageKey)).toBe('other-tab-session');
  storage.removeItem(storageKey);
});
