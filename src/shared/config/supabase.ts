import { createClient } from '@supabase/supabase-js'

// In development, these come from .env.local
// In production, these should come from Vercel environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const SUPABASE_MAX_PAGE_SIZE = 1000
export const SUPABASE_TABLE_CARDS = 'Cards'
export const SUPABASE_TABLE_TALENTS = 'Talents'
