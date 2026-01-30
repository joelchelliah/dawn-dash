/* eslint-disable */
const fs = require('fs')
const path = require('path')
const https = require('https')

/**
 * Script to extract all event objects from the minified Blightbane bundle dump.
 */

const CARDS_API = 'https://blightbane.io/api/cards-codex?search=&rarity=&category=&type=&banner=&exp='
const TALENTS_API = 'https://blightbane.io/api/cards-codex?search=&rarity=&category=10&type=&banner=&exp='

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

async function buildIdToNameMapping() {
  const [cardsRes, talentsRes] = await Promise.all([
    fetchJson(CARDS_API),
    fetchJson(TALENTS_API),
  ])
  const mapping = {}
  for (const item of [...(cardsRes.cards || []), ...(talentsRes.cards || [])]) {
    if (item.id != null && item.name != null) {
      mapping[item.id] = item.name
    }
  }
  return mapping
}

const missingName = (id) => `MISSING NAME [id: ${id}]`

const DUMP_FILE = path.join(__dirname, './data/dump.txt')
const OUTPUT_FILE = path.join(__dirname, './data/events.json')

// All event-related types
const EVENT_TYPES = [0, 1, 2, 3, 4, 5, 8, 10, 99]

async function extractEvents() {
  console.log('Fetching card and talent data from Blightbane API...')
  const idToName = await buildIdToNameMapping()
  console.log(`Loaded ${Object.keys(idToName).length} id->name mappings`)

  const unresolvedIds = new Set()

  console.log('Reading dump file...')
  const content = fs.readFileSync(DUMP_FILE, 'utf-8')

  console.log('Parsing and extracting events...')

  // Strategy: Find the JSON array that contains objects with event types
  // The dump file is minified JavaScript, so we need to extract the JSON array

  // Look for JSON.parse calls that might contain our events
  const jsonParseRegex = /JSON\.parse\('(\[.*?\])'\)/g
  const events = []
  let match

  while ((match = jsonParseRegex.exec(content)) !== null) {
    try {
      // The matched string is escaped, so we need to unescape it
      const jsonString = match[1].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\')

      const parsed = JSON.parse(jsonString)

      // Check if this array contains event objects
      if (Array.isArray(parsed)) {
        const foundEvents = parsed.filter(
          (item) => item && typeof item === 'object' && EVENT_TYPES.includes(item.type)
        )

        if (foundEvents.length > 0) {
          events.push(...foundEvents)
          console.log(`Found ${foundEvents.length} events in this batch`)
        }
      }
    } catch (e) {
      // Skip invalid JSON
      continue
    }
  }

  console.log(`\nTotal events extracted: ${events.length}`)

  if (events.length === 0) {
    console.error('No events found! The dump file format might have changed.')
    process.exit(1)
  }

  // Remove duplicates by caption and text, and filter out events with no text content
  // Group events by caption+text key, then select best one (prefer type 0, else first)
  const eventsByKey = new Map()
  let emptyContentCount = 0

  for (const event of events) {
    // Filter out events with no text content
    if (!event.text || !event.text.trim()) {
      emptyContentCount++
      continue
    }

    // Create a key from caption and text
    const caption = event.caption || event.name || ''
    const text = event.text.trim()
    const key = `${caption}|${text}`

    if (!eventsByKey.has(key)) {
      eventsByKey.set(key, [])
    }
    eventsByKey.get(key).push(event)
  }

  // Process each group and select the best event
  const uniqueEvents = []
  let duplicateCount = 0

  for (const [key, eventGroup] of eventsByKey.entries()) {
    let selectedEvent = eventGroup[0]

    // If there are duplicates, select the one with type 0, else keep first
    if (eventGroup.length > 1) {
      duplicateCount += eventGroup.length - 1
      const type0Event = eventGroup.find((e) => e.type === 0)
      if (type0Event) {
        selectedEvent = type0Event
      }
    }

    // Replace card/talent IDs with names in the related.cards and related.talents arrays
    if (selectedEvent.related) {
      if (selectedEvent.related.cards && Array.isArray(selectedEvent.related.cards)) {
        selectedEvent.related.cards = selectedEvent.related.cards.map((id) => {
          const name = idToName[id]
          if (!name) unresolvedIds.add(Number(id))
          return name || missingName(id)
        })
      }
      if (selectedEvent.related.talents && Array.isArray(selectedEvent.related.talents)) {
        selectedEvent.related.talents = selectedEvent.related.talents.map((id) => {
          const name = idToName[id]
          if (!name) unresolvedIds.add(Number(id))
          return name || missingName(id)
        })
      }
    }

    // Replace numeric IDs in card/talent commands (ADDCARD:123, ADDTALENT:456, etc.)
    selectedEvent.text = selectedEvent.text.replace(
      /(ADDCARD|REMOVECARD|IMBUECARD|ADDTALENT|REMOVETALENT):(\d+)/g,
      (match, command, id) => {
        const numId = parseInt(id, 10)
        const name = idToName[numId]
        if (!name) unresolvedIds.add(numId)
        return name ? `${command}:${name}` : `${command}:${missingName(numId)}`
      }
    )

    uniqueEvents.push(selectedEvent)
  }

  console.log(`Unique events after deduplication: ${uniqueEvents.length}`)
  console.log(`Duplicate events removed: ${duplicateCount}`)
  console.log(`Events filtered out (no text content): ${emptyContentCount}`)

  const unresolvedList = [...unresolvedIds].sort((a, b) => a - b)
  console.log(`\nUnresolved card/talent IDs (not in API mapping): ${unresolvedList.length}`)
  if (unresolvedList.length > 0) {
    console.log(`  IDs: ${unresolvedList.join(', ')}`)
  }

  // Sort by type first, then by name for better organization
  uniqueEvents.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type - b.type
    }
    return (a.name || '').localeCompare(b.name || '')
  })

  // Write to output file with pretty formatting
  console.log(`Writing events to ${OUTPUT_FILE}...`)
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueEvents, null, 2), 'utf-8')

  console.log('Done!')
  console.log(`\nBreakdown by type:`)

  const typeCounts = {}
  for (const event of uniqueEvents) {
    typeCounts[event.type] = (typeCounts[event.type] || 0) + 1
  }

  const typeNames = {
    0: 'NPCs',
    1: 'Unique encounters',
    2: 'Regular events',
    3: 'Area/location events',
    4: 'Boss encounters',
    5: 'Gates/transitions',
    8: 'Special locations',
    10: 'Shrines',
    99: 'Death/completion events',
  }

  for (const type of EVENT_TYPES) {
    if (typeCounts[type]) {
      console.log(`  Type ${type} (${typeNames[type]}): ${typeCounts[type]}`)
    }
  }

  console.log(`\nSample event names:`)
  uniqueEvents.slice(0, 10).forEach((event) => {
    console.log(`  - [Type ${event.type}] ${event.name}`)
  })
}

// Run the extraction
;(async () => {
  try {
    await extractEvents()
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
})()
