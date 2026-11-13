import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  )
}

// El callback de acceso usa un cliente aislado: nunca consume códigos en la sesión invitada.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { detectSessionInUrl: window.location.pathname !== '/auth/google' },
})

export function createGoogleSignInClient(storageKey) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce', storage: window.sessionStorage, storageKey,
      persistSession: true, autoRefreshToken: false, detectSessionInUrl: false,
    },
  })
}
