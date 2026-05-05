import { createClient } from '@supabase/supabase-js'

// Cliente para uso en API Routes (server-side, con permisos completos)
export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
}

// Fetch directo al REST API de Supabase con service role (evita que el cliente JS use sesión de usuario)
export function supabaseAdminFetch(path, options = {}) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  }).then(r => r.json())
}

// Cliente para uso en frontend (solo lectura pública)
export function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
