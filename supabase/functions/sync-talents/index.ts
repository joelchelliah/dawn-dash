/* eslint-disable no-console */
/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { corsHeaders } from '../_shared/cors.ts'
import { TalentApiResponse, TalentData, TalentsApiResponse } from '../_shared/types.ts'

/*
 * Supabase function for syncing talents from Blightbane API to Supabase database

 * To deploy, run `npx supabase functions deploy sync-talents`
 * Then go to the Dasboard, into Edge Functions, and run it from there.
 *
 * Can optionally also use curl
 */

const BLIGHTBANE_URL = 'https://blightbane.io/api'
const TALENTS_TABLE = 'Talents'

async function fetchTalentsFromBlightbane(): Promise<TalentData[]> {
  console.info('Fetching all talents from Blightbane API...')

  const url = `${BLIGHTBANE_URL}/cards-codex?search=&rarity=&category=10&type=&banner=&exp=`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data: TalentsApiResponse = await response.json()
    const { card_len, cards: talents } = data

    console.info(`Fetched ${card_len} talents from API`)

    const output = await Promise.all(
      talents.map(async (talent, index) => {
        try {
          console.info(`Processing talent ${index + 1}/${talents.length}: ${talent.name}`)
          const details = await fetchDetailedTalent(talent.name)

          if (!details) {
            throw new Error(`Details returned null/undefined for ${talent.name}`)
          }

          return {
            name: talent.name,
            description: talent.description,
            flavour_text: details.flavortext ?? '',
            tier: talent.rarity,
            expansion: talent.expansion,
            events: details.events ?? [],
            requires_classes: [],
            requires_energy: [],
            requires_talents: (details.prereq ?? []).map(Number),
            required_for_talents: (details.ispreq ?? []).map(Number),
            event_requirement_matrix: [],
            requires_cards: [],
            blightbane_id: talent.id,
            last_updated: new Date().toISOString(),
            verified: false,
          } as TalentData
        } catch (error) {
          console.error(
            `Failed to process talent ${talent.name} (${index + 1}/${talents.length}):`,
            error
          )
          throw error
        }
      })
    )

    console.info(`Talent fetch completed. Total talents fetched: ${output.length}`)
    return output
  } catch (error) {
    console.error('Error fetching talents:', error)
    throw error
  }
}

async function fetchDetailedTalent(talentName: string): Promise<TalentApiResponse> {
  const safeTalentName = talentName.replace(/ /g, '%20')
  console.info(`Fetching details for ${safeTalentName}`)

  try {
    const url = `${BLIGHTBANE_URL}/card/${safeTalentName}?talent=true`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    console.info(`Successfully fetched details for ${safeTalentName}`)
    return data
  } catch (error) {
    console.error(`Error fetching details for ${safeTalentName}:`, error)
    throw error
  }
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.info('Fetching talents from Blightbane API...')
    const talentsFromBlightbane = await fetchTalentsFromBlightbane()
    console.info(`Fetched ${talentsFromBlightbane.length} talents from Blightbane`)

    // Only clear the table if 'clear' is true
    const url = new URL(req.url)
    let clearTable = url.searchParams.get('clear') === 'true'
    if (!clearTable && req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      if (body.clear === true) clearTable = true
    }

    if (clearTable) {
      console.info('Clearing existing talents...')
      const { error } = await supabaseClient.from(TALENTS_TABLE).delete().neq('id', 0)
      if (error) {
        console.error('Error clearing table:', error)
        throw error
      }
      console.info('Table cleared successfully')
    }

    // Note that even when selecting only the blightbane_id, the data is still returned as an array of objects!
    console.info('Fetching existing talent IDs from database...')
    const { data: existingTalentIdData, error: fetchError } = await supabaseClient
      .from(TALENTS_TABLE)
      .select('blightbane_id')

    if (fetchError) {
      console.error('Error fetching existing talents:', fetchError)
      throw fetchError
    }

    console.info(`Found ${existingTalentIdData?.length ?? 0} existing talents in database`)

    const existingIds = new Set(
      (existingTalentIdData ?? []).map(({ blightbane_id }) => blightbane_id)
    )
    const newTalents = talentsFromBlightbane.filter(
      ({ blightbane_id }) => !existingIds.has(blightbane_id)
    )

    if (newTalents.length > 0) {
      console.info(`Inserting ${newTalents.length} new talents into database...`)
      const { error } = await supabaseClient.from(TALENTS_TABLE).insert(newTalents).select()

      if (error) {
        console.error('Error inserting talents:', error)
        throw error
      }
    } else {
      console.info('No new talents to insert')
    }

    console.info('Successfully completed talent sync')
    return new Response('DONE!', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    })
  } catch (error) {
    console.error('Fatal error in sync-talents function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
