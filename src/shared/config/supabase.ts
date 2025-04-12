import { createClient } from '@supabase/supabase-js'

// Log all environment variables (for debugging)
console.log('Environment variables:', {
  REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  REACT_APP_SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  NODE_ENV: process.env.NODE_ENV,
})

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    supabaseUrl,
    supabaseAnonKey,
    allEnv: process.env,
  })
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const SUPABASE_MAX_PAGE_SIZE = 1000
export const SUPABASE_TABLE_CARDS = 'Cards'
