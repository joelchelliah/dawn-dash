#!/usr/bin/env node

/**
 * Parse transmute rules data
 *
 * Reads scripts/data/transmutes.json and writes the parts Transmute uses to
 * src/transmute/data/transmute-rules.json, after validating that every id it references is known.
 *
 * Colors and rarities are converted to the numbers `CardData` uses (banner 1–11, rarity 0–4),
 * so the tool can compare them directly with Blightbane card data. The upstream `cards` map stays
 * the source of truth for both: Blightbane gets ~100 of them wrong (e.g. Monster-rarity cards
 * with a non-Monster banner).
 */

const path = require('path')

const {
  pickFields,
  writeJson,
  logIgnoredFields,
  readInputFile,
  ensureOutputDir,
} = require('./whitelist-fields')

const INPUT_FILE = path.join(__dirname, '../data', 'transmutes.json')
const OUTPUT_DIR = path.join(__dirname, '../../src/transmute/data')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'transmute-rules.json')

const COLORS = {
  Green: 1,
  Blue: 2,
  Red: 3,
  Purple: 4,
  Brown: 5,
  Aqua: 6,
  White: 7,
  Holy: 8,
  Black: 9,
  Orange: 10,
  Monster: 11,
}

const RARITIES = { Common: 0, Uncommon: 1, Rare: 2, Legendary: 3, Monster: 4 }

const ROUTES = ['transmute', 'sidemute', 'tradepost']

// Upstream lists stats in this order, so anything else is a format change worth stopping for
const REQUIREMENT_PATTERN = /^(HOLY|any|DEX(\|INT)?(\|STR)?|INT(\|STR)?|STR)$/

const TOP_FIELDS = [
  'kind',
  'version',
  'date',
  'count',
  'rules',
  'pool',
  'monsterSidemute',
  'exceptions',
  'potions',
  'cards',
]
const RULE_FIELDS = {
  transmute: ['events', 'cards', 'candidates'],
  sidemute: ['events', 'candidates', 'monsterBranch'],
  tradepost: ['cards', 'candidates', 'note', 'adds', 'removes'],
}
const EXCEPTION_FIELDS = ['cannotBeSource', 'castRequirement', 'notes']
const CANNOT_BE_SOURCE_FIELDS = ['id', 'cards', 'reason', 'blocks']
const CAST_REQUIREMENT_FIELDS = ['id', 'name', 'color', 'requires']
const NOTE_FIELDS = ['id', 'cards', 'note']

/*
 * Upstream describes these rules in prose and the tool implements them itself (Black sidemutes
 * into Brown, the Monster branch, Tradepost's own pool, ...). Changed prose likely means a changed
 * rule, so it is reported rather than silently dropped.
 */
const EXPECTED_RULE_TEXT = {
  'rules.transmute.candidates': 'pool, same color, one rarity up',
  'rules.sidemute.candidates': 'pool, same color (Black sources use Brown), same rarity',
  'rules.sidemute.monsterBranch.when': 'source color is Monster',
  'rules.sidemute.monsterBranch.candidates': 'monsterSidemute, any rarity',
  'rules.tradepost.candidates':
    'pool + adds - removes, same color and same rarity as the source (Black stays Black, no Monster branch)',
  'rules.tradepost.note':
    'No Monster-rarity card is a candidate, so Tradepost cannot replace any Monster-rarity card, whatever its banner',
}

// Distant Memory, the only White card. The tool shows a fixed message for it instead of the note
const KNOWN_NOTE_CARDS = [990007]

function get(object, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], object)
}

function toColorAndRarity([color, rarity], label) {
  if (!(color in COLORS)) throw new Error(`${label}: unknown color "${color}"`)
  if (!(rarity in RARITIES)) throw new Error(`${label}: unknown rarity "${rarity}"`)

  return [COLORS[color], RARITIES[rarity]]
}

function toRequirement(requires, label) {
  if (!REQUIREMENT_PATTERN.test(requires)) {
    throw new Error(`${label}: unexpected requirement "${requires}"`)
  }

  // An empty list means anyone can transmute into it, like Brown and Black cards
  return requires === 'any' ? [] : requires.toLowerCase().split('|')
}

function main() {
  try {
    const data = readInputFile(
      INPUT_FILE,
      'transmutes.json comes from the external transmute-extraction tool'
    )

    const ignored = new Set()
    const { rules, exceptions } = pickFields(data, TOP_FIELDS, ignored, 'transmutes')

    if (!data.cards || typeof data.cards !== 'object') {
      throw new Error('Missing or invalid `cards` field')
    }
    for (const route of ROUTES) {
      if (!rules?.[route]) throw new Error(`Missing \`rules.${route}\``)
      pickFields(rules[route], RULE_FIELDS[route], ignored, `rules.${route}`)
    }
    pickFields(exceptions ?? {}, EXCEPTION_FIELDS, ignored, 'exceptions')

    const cards = {}
    for (const [id, value] of Object.entries(data.cards)) {
      if (!/^\d+$/.test(id)) throw new Error(`cards: id "${id}" is not a number`)
      cards[id] = toColorAndRarity(value, `cards.${id}`)
    }

    const cardCount = Object.keys(cards).length
    if (cardCount !== data.count) {
      throw new Error(`\`count\` is ${data.count}, but \`cards\` has ${cardCount} entries`)
    }

    const checkIds = (ids, label) => {
      if (!Array.isArray(ids)) throw new Error(`${label}: expected an array of ids`)

      const seen = new Set()
      for (const id of ids) {
        if (!Number.isInteger(id))
          throw new Error(`${label}: id ${JSON.stringify(id)} is not a number`)
        if (!(id in cards)) throw new Error(`${label}: id ${id} is missing from \`cards\``)
        if (seen.has(id)) throw new Error(`${label}: id ${id} is listed twice`)
        seen.add(id)
      }

      return ids
    }

    const pool = checkIds(data.pool, 'pool')
    const monsterSidemute = checkIds(data.monsterSidemute, 'monsterSidemute')
    const adds = checkIds(rules.tradepost.adds, 'rules.tradepost.adds')
    const removes = checkIds(rules.tradepost.removes, 'rules.tradepost.removes')

    const poolIds = new Set(pool)
    const addedPoolIds = adds.filter((id) => poolIds.has(id))
    if (addedPoolIds.length > 0) {
      throw new Error(`rules.tradepost.adds: already in pool: ${addedPoolIds.join(', ')}`)
    }
    const removedNonPoolIds = removes.filter((id) => !poolIds.has(id))
    if (removedNonPoolIds.length > 0) {
      throw new Error(`rules.tradepost.removes: not in pool: ${removedNonPoolIds.join(', ')}`)
    }

    const potions = checkIds(Object.keys(data.potions ?? {}).map(Number), 'potions')
    for (const id of potions) {
      const potion = toColorAndRarity(data.potions[id], `potions.${id}`)
      if (potion.join() !== cards[id].join()) {
        throw new Error(`potions.${id}: color/rarity disagrees with \`cards\``)
      }
    }

    const cannotBeSource = (exceptions?.cannotBeSource ?? []).map((group, index) => {
      const label = `exceptions.cannotBeSource[${group.id ?? index}]`
      pickFields(group, CANNOT_BE_SOURCE_FIELDS, ignored, 'exceptions.cannotBeSource[]')

      if (typeof group.id !== 'string') throw new Error(`${label}: missing \`id\``)
      if (typeof group.reason !== 'string') throw new Error(`${label}: missing \`reason\``)
      if (!Array.isArray(group.blocks) || group.blocks.some((r) => !ROUTES.includes(r))) {
        throw new Error(`${label}: \`blocks\` must only name ${ROUTES.join(', ')}`)
      }

      return {
        id: group.id,
        reason: group.reason,
        blocks: group.blocks,
        cards: checkIds(group.cards, label),
      }
    })

    const castRequirements = {}
    for (const entry of exceptions?.castRequirement ?? []) {
      const label = `exceptions.castRequirement[${entry.id}]`
      pickFields(entry, CAST_REQUIREMENT_FIELDS, ignored, 'exceptions.castRequirement[]')
      checkIds([entry.id], label)

      if (COLORS[entry.color] !== cards[entry.id][0]) {
        throw new Error(`${label}: color "${entry.color}" disagrees with \`cards\``)
      }
      castRequirements[entry.id] = toRequirement(entry.requires, label)
    }

    for (const entry of exceptions?.notes ?? []) {
      pickFields(entry, NOTE_FIELDS, ignored, 'exceptions.notes[]')
      const unknown = checkIds(entry.cards, `exceptions.notes[${entry.id}]`).filter(
        (id) => !KNOWN_NOTE_CARDS.includes(id)
      )
      if (unknown.length > 0) {
        console.warn(
          `\n⚠️  New note for ${unknown.join(', ')}: "${entry.note}"\n` +
            '   The tool has no message for these cards yet.'
        )
      }
    }

    for (const [rulePath, expected] of Object.entries(EXPECTED_RULE_TEXT)) {
      const actual = get(data, rulePath)
      if (actual !== expected) {
        console.warn(
          `\n⚠️  ${rulePath} changed. Check whether the rule the tool implements still holds.\n` +
            `   was: ${JSON.stringify(expected)}\n` +
            `   now: ${JSON.stringify(actual)}`
        )
      }
    }

    const output = {
      version: data.version,
      date: data.date,
      routes: {
        transmute: { events: rules.transmute.events, cards: rules.transmute.cards },
        sidemute: { events: rules.sidemute.events },
        tradepost: { cards: rules.tradepost.cards },
      },
      cards,
      pool,
      monsterSidemute,
      tradepost: { adds, removes },
      potions,
      cannotBeSource,
      castRequirements,
    }

    ensureOutputDir(OUTPUT_DIR)

    console.log('\nWriting output file...')
    console.log(
      `   ${cardCount} cards, ${pool.length} pool, ${monsterSidemute.length} monster sidemute, ` +
        `${adds.length}/${removes.length} Tradepost adds/removes, ${potions.length} potions, ` +
        `${cannotBeSource.length} cannot-be-source groups, ` +
        `${Object.keys(castRequirements).length} cast requirements (version ${data.version})`
    )
    writeJson(OUTPUT_FILE, output, 'transmute rules')

    logIgnoredFields(ignored, 'the *_FIELDS constants')

    console.log('\nSuccess!')
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
