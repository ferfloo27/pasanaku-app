import { createClient } from '@supabase/supabase-js'
import { AppError } from '../errors/appError'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  )
}

function sessionStorageBackend() {
  try {
    const storage = window.localStorage
    const probe = `pasanaku-auth-probe-${crypto.randomUUID()}`
    storage.setItem(probe, '1'); storage.removeItem(probe)
    return storage
  } catch {
    // Igual que el SDK, las sesiones invitadas pueden funcionar solo en memoria.
    const values = new Map()
    return { getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value) }, removeItem: key => { values.delete(key) } }
  }
}
const backingStorage = sessionStorageBackend()
// Conserva exactamente la clave por defecto del SDK y las sesiones ya publicadas.
const primaryStorageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
let commitGuard
const primaryStorage = {
  getItem: key => backingStorage.getItem(key),
  setItem: (key, value) => { commitGuard?.(); backingStorage.setItem(key, value) },
  removeItem: key => {
    if (commitGuard) { commitGuard(); throw new Error('Session removal during activation') }
    backingStorage.removeItem(key)
  },
}
// Cubre también el await interno de setSession antes de que el SDK persista y anuncie.
export async function withAuthStorageGuard(check, operation) {
  if (commitGuard) throw new AppError('AUTH_SESSION_CHANGED')
  const original = backingStorage.getItem(primaryStorageKey)
  commitGuard = () => {
    check()
    if (backingStorage.getItem(primaryStorageKey) !== original) throw new AppError('AUTH_SESSION_CHANGED')
  }
  try { commitGuard(); return await operation() }
  finally { commitGuard = undefined }
}

// El callback de acceso usa un cliente aislado: nunca consume códigos en la sesión invitada.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: primaryStorage, storageKey: primaryStorageKey,
    detectSessionInUrl: window.location.pathname.replace(/\/+$/, '') !== '/auth/google' },
})

export function createGoogleSignInClient(storageKey) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce', storage: window.sessionStorage, storageKey,
      persistSession: true, autoRefreshToken: false, detectSessionInUrl: false,
    },
  })
}
