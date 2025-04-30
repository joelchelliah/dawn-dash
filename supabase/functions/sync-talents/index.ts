/* eslint-disable no-console */
/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { corsHeaders } from '../_shared/cors.ts'
import { TalentData, TalentsApiResponse } from '../_shared/types.ts'

/*
 * Supabase function for syncing talents from Blightbane API to Supabase database

 * Run `supabase functions deploy sync-talents`
 * Run `supabase functions list` to get the URL of the function
 * Run `supabase functions list --remote` to get the URL of the function from the remote server
 *
 */

const BLIGHTBANE_URL = 'https://blightbane.io/api'
const TALENTS_TABLE = 'Talents'

async function fetchTalentsFromBlightbane(): Promise<TalentData[]> {
  const numTiers = 7
  const aggregatedTalents: TalentData[] = []

  for (let tier = 0; tier < numTiers; tier++) {
    console.info(`Fetching talents for tier=${tier}`)

    const options = `search=&rarity=${tier}&category=10&type=&banner=&exp=`
    const url = `${BLIGHTBANE_URL}/cards?${options}`

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: TalentsApiResponse = await response.json()
      const { card_len, cards: talents } = data

      if (card_len > 100) {
        console.error(`Too many talents! Tier: ${tier}, Count: ${card_len}`)
        continue
      }

      const output = talents.map((talent) => ({
        name: talent.name,
        description: talent.description,
        flavour_text: '',
        tier: talent.rarity,
        expansion: talent.expansion,
        events: [],
        requires_classes: [],
        requires_energy: [],
        requires_talents: [],
        required_by_talents: [],
        blightbane_id: talent.id,
      }))

      aggregatedTalents.push(...output)
    } catch (error) {
      console.error(`Error fetching talents for tier=${tier}:`, error)
    }
  }

  console.info(`Talent fetch completed. Total talents fetched: ${aggregatedTalents.length}`)
  return aggregatedTalents
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.info('-- Starting sync-talents function execution --')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    console.info('Clearing existing talents from database...')
    const { error: deleteError } = await supabaseClient.from(TALENTS_TABLE).delete().neq('id', 0)

    // TODO: Probably don't want to clear each time... find a way to only insert new ones???

    if (deleteError) {
      console.error('Error clearing talents:', deleteError)
      throw deleteError
    }

    console.info('Fetching new talents from Blightbane API...')
    const talents = await fetchTalentsFromBlightbane()

    // TODO: For new talents, we need to fetch from detailed endpoint and update the talent data

    console.info(`Inserting ${talents.length} new talents into database...`)
    const { data, error } = await supabaseClient.from(TALENTS_TABLE).insert(talents).select()

    if (error) {
      console.error('Error inserting talents:', error)
      throw error
    }

    console.info('Successfully completed talent sync')
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Fatal error in sync-talents function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
