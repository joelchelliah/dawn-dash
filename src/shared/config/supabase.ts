import { createClient, SupabaseClient } from '@supabase/supabase-js'

// In development, these come from .env.local
// In production, these should come from Vercel environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabaseInstance: SupabaseClient | null = null

export const getSupabase = () => {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseInstance
}

// For backward compatibility
export const supabase = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    return getSupabase()[prop as keyof SupabaseClient]
  },
})

export const SUPABASE_MAX_PAGE_SIZE = 1000
export const SUPABASE_TABLE_CARDS = 'Cards'
export const SUPABASE_TABLE_TALENTS = 'Talents'
