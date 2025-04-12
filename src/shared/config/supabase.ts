import { createClient } from '@supabase/supabase-js'

// REACT_APP_ prefix is for local development
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const SUPABASE_MAX_PAGE_SIZE = 1000
export const SUPABASE_TABLE_CARDS = 'Cards'
