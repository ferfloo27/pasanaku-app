import { afterAll, beforeAll, expect, it, vi } from 'vitest';

// SDK real, solo la red simulada: reproduce el await de setSession antes de _saveSession.
let supabase; let withAuthStorageGuard;
const request = vi.fn();
const guest = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', is_anonymous: true };
const google = { id: '22222222-2222-4222-8222-222222222222', aud: 'authenticated', role: 'authenticated', is_anonymous: false };
const response = user => new Response(JSON.stringify(user), { status: 200, headers: { 'Content-Type': 'application/json' } });
function tokens(user) {
  const encode = data => btoa(JSON.stringify(data)).replace(/=+$/, '').replaceAll('+', '-').replaceAll('/', '_');
  return { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.dGVzdA`, refresh_token: 'test-refresh' };
}
beforeAll(async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-public-key');
  vi.stubGlobal('fetch', request);
  ({ supabase, withAuthStorageGuard } = await import('./supabase'));
  await supabase.auth.initialize(); supabase.auth.stopAutoRefresh();
});
afterAll(() => {
  supabase?.auth.stopAutoRefresh(); localStorage.removeItem('sb-example-auth-token');
  vi.unstubAllGlobals(); vi.unstubAllEnvs();
});
it('cancelar mientras el SDK valida Google no cambia el invitado ni anuncia SIGNED_IN', async () => {
  request.mockResolvedValue(response(guest));
  await supabase.auth.setSession(tokens(guest));
  const events = [];
  const { data: { subscription } } = supabase.auth.onAuthStateChange(event => { events.push(event); });
  let release; let cancelled = false;
  request.mockImplementationOnce(() => new Promise(resolve => { release = () => resolve(response(google)); }));
  const result = withAuthStorageGuard(() => { if (cancelled) throw new Error('cancelled'); }, () => supabase.auth.setSession(tokens(google)));
  await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  cancelled = true; release();
  await expect(result).rejects.toThrow('cancelled');
  expect((await supabase.auth.getSession()).data.session.user.id).toBe(guest.id);
  expect(events).not.toContain('SIGNED_IN'); subscription.unsubscribe();
});
it('activar Google con el SDK real conserva la clave y permite leer la cuenta nueva', async () => {
  request.mockResolvedValue(response(google));
  const result = await withAuthStorageGuard(() => {}, () => supabase.auth.setSession(tokens(google)));
  expect(result.error).toBeNull();
  expect((await supabase.auth.getSession()).data.session.user.id).toBe(google.id);
});
