/* eslint-disable no-console */
/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/*
 * Public read-only endpoint for getting all talent names
 * No authentication required - open API endpoint
 *
 * To deploy, run `npx supabase functions deploy talents-name`
 *
 * Note: After each new deploy, the `Verify JWT with legacy secret` option needs to
 * be manually disabled in the function settings on Supabase.
 *
 * Usage: GET https://ffclklevsquhuuzepxsf.supabase.co/functions/v1/talents-name
 * Returns: Array of {id, name} objects
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Fetch all talent names
    const { data, error } = await supabase.from('Talents').select('name')

    if (error) {
      console.error('DB error', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract names, sort alphabetically, and create response
    const names = (data ?? []).map((talent: { name: string }) => talent.name).sort()
    const response = {
      count: names.length,
      names: names,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('Unexpected error', err)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
