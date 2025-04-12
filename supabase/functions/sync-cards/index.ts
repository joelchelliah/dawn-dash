/* eslint-disable no-console */
/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { corsHeaders } from '../_shared/cors.ts'
import { CardData, CardsApiResponse } from '../_shared/types.ts'

/*
 * Supabase function for syncing cards from Blightbane API to Supabase database

 * Run `supabase functions deploy sync-cards`
 * Run `supabase functions list` to get the URL of the function
 * Run `supabase functions list --remote` to get the URL of the function from the remote server
 *
 */

const BLIGHTBANE_URL = 'https://blightbane.io/api'
const CARDS_TABLE = 'Cards'

async function fetchCardsFromBlightbane(): Promise<CardData[]> {
  const numExpansions = 8
  const numBanners = 12
  const aggregatedCards: CardData[] = []

  for (let exp = 0; exp < numExpansions; exp++) {
    for (let banner = 0; banner < numBanners; banner++) {
      // Skip Monster cards
      if (exp === 0 && banner === 11) continue

      console.info(`Fetching cards for banner=${banner}, exp=${exp}`)

      const options = `search=&rarity=&category=&type=&banner=${banner}&exp=${exp}`
      const url = `${BLIGHTBANE_URL}/cards?${options}`

      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: CardsApiResponse = await response.json()
        const { card_len, cards } = data

        if (card_len > 100) {
          console.error(`Too many cards! Banner: ${banner}, Exp: ${exp}, Count: ${card_len}`)
          continue
        }

        const output = cards.map((card) => ({
          name: card.name,
          description: card.description,
          rarity: card.rarity,
          type: card.type,
          category: card.category,
          expansion: card.expansion,
          color: card.color,
          blightbane_id: card.id,
        }))

        aggregatedCards.push(...output)
      } catch (error) {
        console.error(`Error fetching cards for banner=${banner}, exp=${exp}:`, error)
      }
    }
  }

  console.info(`Card fetch completed. Total cards fetched: ${aggregatedCards.length}`)
  return aggregatedCards
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.info('-- Starting sync-cards function execution --')

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

    console.info('Clearing existing cards from database...')
    const { error: deleteError } = await supabaseClient.from(CARDS_TABLE).delete().neq('id', 0)

    if (deleteError) {
      console.error('Error clearing cards:', deleteError)
      throw deleteError
    }

    console.info('Fetching new cards from Blightbane API...')
    const cards = await fetchCardsFromBlightbane()

    console.info(`Inserting ${cards.length} new cards into database...`)
    const { data, error } = await supabaseClient.from(CARDS_TABLE).insert(cards).select()

    if (error) {
      console.error('Error inserting cards:', error)
      throw error
    }

    console.info('Successfully completed card sync')
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Fatal error in sync-cards function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
