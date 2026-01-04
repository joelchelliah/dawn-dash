/* eslint-disable */
const fs = require('fs')
const path = require('path')

/**
 * Script to extract all event objects from the minified Blightbane bundle.
 *
 * Event types found in the game:
 * - Type 0: NPCs (Alchemist, Blacksmith, Priest, etc.)
 * - Type 1: Unique encounters?
 * - Type 2: Regular events/encounters
 * - Type 3: Area/location events (Bandit Camp, Strange Carvings, etc.)
 * - Type 4: Boss/special encounters (Serena Hellspark, Chieftain Tagdahar)
 * - Type 5: Gates/transitions
 * - Type 8: Special locations (Inns, Glades, etc.)
 * - Type 10: Shrines
 * - Type 99: Death/completion events
 */

/**
 * Manual lookup for card and talent IDs found in dump.txt
 */
const CARD_ID_TO_NAME = {
  666: 'Deal with the Devil', // Talents
  1561: 'Aurora Prism', // Cards
  5414: 'Sacred Ward', // Cards
  15614: 'Broken Amulet', // Cards
  22989: 'Devotion', // Talents
  38256: 'Frozen Heart', // Talents
  53453: '- MISSING NAME -',
  53894: 'Prayer', // Cards
  57436: '- MISSING NAME -',
  66969: '- MISSING NAME -',
  67258: 'Sacred Zest', // Talents
  68653: 'Faith Healing', // Cards
  77411: 'Berzerker', // Talents
  89119: '- MISSING NAME -',
  114406: '- MISSING NAME -',
  119978: 'Stormaxe', // Cards
  122116: '- MISSING NAME -',
  125942: 'Scatter Souls', // Cards
  134055: '- MISSING NAME -',
  137930: 'Blessing of Serem-Pek', // Talents
  152646: '- MISSING NAME -',
  157577: 'Taste of Chaos', // Talents
  160739: 'Pride', // Cards
  178462: 'Asteran', // Cards
  180647: '- MISSING NAME -',
  201882: 'Caravan Wagon', // Cards
  207559: 'Stormbringer', // Talents
  214398: '- MISSING NAME -',
  230852: 'Pragmatism', // Talents
  240709: 'Fire Immunity', // Talents
  244124: '- MISSING NAME -',
  256570: 'Lust', // Cards
  271941: '- MISSING NAME -',
  274715: 'Dark Ritualist', // Talents
  281179: 'Lifedrinker Venom', // Cards
  295680: 'Potion of Alacrity', // Cards
  307462: 'Tradepost', // Cards
  311688: 'Strategist', // Talents
  318154: 'Blood Ritual', // Cards
  322523: 'Surge of Strength', // Cards
  326691: 'Torch', // Cards
  326889: 'Golden Idol', // Cards
  334396: 'Blessing of the White Rose', // Talents
  338628: 'Ire of Serem-Pek', // Cards
  350989: 'Unimpressed', // Talents
  353519: 'Healing Potion', // Cards
  372964: 'Lovebite', // Talents
  374531: 'Bubbly Brew', // Cards
  382714: 'Compassionate', // Talents
  384654: 'Emporium Discount', // Talents
  384885: 'Surge of Intellect', // Cards
  395987: 'Divine Focus', // Cards
  401467: 'Wrath', // Cards
  415692: 'Drakkan', // Cards
  422320: 'Greed', // Cards
  434520: 'Legion Insight', // Talents
  435255: '- MISSING NAME -',
  436947: '- MISSING NAME -',
  449843: 'Skylars Kiss', // Talents
  450681: 'Hellforged Axe', // Cards
  453300: '- MISSING NAME -',
  456818: 'Aspect of Wisdom', // Cards
  458928: 'Dark Inquiry', // Cards
  472276: '- MISSING NAME -',
  473821: '- MISSING NAME -',
  479204: 'Fire Resistance', // Talents
  480987: 'Hide Armor', // Talents
  494644: '- MISSING NAME -',
  495673: 'Grounding Weapon', // Talents
  519176: '- MISSING NAME -',
  538635: "Rogue's Locket", // Cards
  551990: 'Alchemist', // Talents
  552273: 'Perception', // Talents
  557834: 'Panacea', // Cards
  561066: 'Peace of Mind', // Talents
  561258: '- MISSING NAME -',
  561648: 'Towershield', // Cards
  564994: 'Scythe', // Cards
  574923: 'Diamond Mind', // Talents
  576016: 'Raven Familiar', // Cards
  586945: 'Zealous', // Talents
  599544: 'Aspect of Courage', // Cards
  604258: 'Gluttony', // Cards
  615389: 'The Dawnbringer', // Cards
  636964: 'Abyssal Resistance', // Talents
  637350: 'Faerytales', // Talents
  638016: "Hunter's Presence", // Cards
  661888: '- MISSING NAME -',
  662616: 'Scimitar', // Cards
  675540: 'Steel Longsword', // Cards
  690796: '- MISSING NAME -',
  699673: 'Mobility', // Talents
  701906: 'First Aid Kit', // Cards
  706272: 'Sanctifier', // Talents
  726166: 'Sloth', // Cards
  728501: 'Goldstrike', // Cards
  730258: 'Infernal Racket', // Cards
  734590: '- MISSING NAME -',
  757746: 'Thundering Weapon', // Talents
  759951: '- MISSING NAME -',
  768659: 'Blessing of Aethos', // Talents
  780353: 'Spirit Bond', // Cards
  781951: 'Hellforged Weapons', // Talents
  783723: "Arcanist's Locket", // Cards
  784765: 'Conviction', // Cards
  793943: 'Forbidden Knowledge', // Talents
  795845: 'Maki Tagdahar', // Cards
  810652: 'Holy Water', // Cards
  816971: 'Sharpening Stone', // Cards
  821566: 'Arcane Ward', // Cards
  823805: 'Aspect of Compassion', // Cards
  830363: 'Envy', // Cards
  837633: '- MISSING NAME -',
  855931: 'Potion of Visions', // Cards
  870678: 'Watched', // Talents
  871945: 'Idolize', // Cards
  872166: '- MISSING NAME -',
  898850: 'Prismatic Shard', // Cards
  908268: '- MISSING NAME -',
  917541: 'Surge of Dexterity', // Cards
  924616: 'Pious', // Talents
  943265: 'Balors Blessing', // Talents
  946224: 'Contained Anima', // Cards
  954056: '- MISSING NAME -',
  961205: 'Hallowed Ground', // Cards
  964263: 'Vampirism', // Cards
  972587: 'Stormscarred', // Talents
  978149: 'Dark Mirror Vial', // Cards
  983780: '- MISSING NAME -',
  986478: '- MISSING NAME -',
  988854: '- MISSING NAME -',
  990096: '- MISSING NAME -',
}

// TODO: Make 4 separate blacklists for:
// - Events that have no effects
// - Events that have no branches (always single or zero children)
// - Events that only have effects: [QUESTFLAG, AREASPECIAL]
// - Events that are currently too complex to render
//
// We should find the first 3 programmatically, and the last one manually.
//

const EVENTS_BLACKLIST = [
  // Mostly story events:
  'Burned Missive',
  'Consul GiveBanditQuest', // Consul Briefing
  'Consul GiveGroveQuest', // Consul Briefing
  'Enchanter', // Isle of Talos
  'Consul BanditQuestReward',
  'Count Vesparin',
  'Emberwyld Heights Finish',
  'Empowered Hydra Death',
  'Glowing Runes',
  'Gorn Tagdahar Death',
  'Grove of the Dying Star Finish',
  'Heart of the Temple',
  "Heroes' Rest Cemetery Start",
  'Hidden Library',
  'High Priest of Agony Death',
  'High Priest of Chaos Death',
  'High Priest of Hatred Death',
  'Kaius Tagdahar Death',
  'Lord of Despair Death',
  'Lost Journal', // Discarded Journal
  'Noxlight Swamp Finish',
  'Obsidian Garden Finish',
  'Outerworldly Entity Death',
  'Overgrown Stone',
  'Queen of Decay Death',
  'Rathael the Slain Death',
  'Sanctum of Wrath Finish',
  'Shard of Mirrors',
  'Shard of Strife',
  'Semira Death',
  'Spine of Night Finish',
  'Starlit Druid', // Druid of the Grove
  'Statue of Ilthar II Death',
  'Strange Carvings', // Bandit Markings
  'Sunfall Meadows Start',
  'Survivor',
  'The Ambermines Finish',
  'The Decayed Sanctum Start',
  'The Defiled Sanctum',
  'The Defiled Sanctum Start',
  'The Countess',
  'The Eldritch Sanctum Start',
  'The Isle of Talos Finish',
  'The Pale Warden Death',
  'The Silent Reliquary Start',
  'The Traveler', // Stranger on horseback
  'The Voice Below', // The Voice
  'Torn Cloth',
  'Weeping Woods Finish',
  'Weeping Woods Start',
  // Too complex. Ignored for now:
  'Brightcandle Inn',
  'Frozen Heart',
  'Rotting Residence',
  'Suspended Cage',
]

const DUMP_FILE = path.join(__dirname, './dump.txt')
const OUTPUT_FILE = path.join(__dirname, './events.json')

// All event-related types
const EVENT_TYPES = [0, 1, 2, 3, 4, 5, 8, 10, 99]

function extractEvents() {
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

  // Remove duplicates by name and filter out events with no text content
  const uniqueEvents = []
  const seen = new Set()
  let emptyContentCount = 0

  for (const event of events) {
    if (!seen.has(event.name)) {
      seen.add(event.name)

      // Filter out events with no text content
      if (event.text && event.text.trim()) {
        // Replace card/talent IDs with names in the related.cards and related.talents arrays
        if (event.related) {
          if (event.related.cards && Array.isArray(event.related.cards)) {
            event.related.cards = event.related.cards.map((id) =>
              CARD_ID_TO_NAME[id] ? CARD_ID_TO_NAME[id] : id
            )
          }
          if (event.related.talents && Array.isArray(event.related.talents)) {
            event.related.talents = event.related.talents.map((id) =>
              CARD_ID_TO_NAME[id] ? CARD_ID_TO_NAME[id] : id
            )
          }
        }

        // Replace numeric IDs in card/talent commands (ADDCARD:123, ADDTALENT:456, etc.)
        event.text = event.text.replace(
          /(ADDCARD|REMOVECARD|IMBUECARD|ADDTALENT|REMOVETALENT):(\d+)/g,
          (match, command, id) => {
            const numId = parseInt(id, 10)
            const name = CARD_ID_TO_NAME[numId]
            return name ? `${command}:${name}` : match
          }
        )

        // Mark blacklisted events as excluded
        if (EVENTS_BLACKLIST.includes(event.name)) {
          event.excluded = true
        }

        uniqueEvents.push(event)
      } else {
        emptyContentCount++
      }
    }
  }

  console.log(`Unique events after deduplication: ${uniqueEvents.length}`)
  console.log(`Events filtered out (no text content): ${emptyContentCount}`)

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
try {
  extractEvents()
} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
