/**
 * Shared plumbing for the whitelist-based sync scripts (sync-treasures, sync-weapons).
 *
 * Each of those reads a JSON file pasted in from an external extraction tool, which carries
 * far more per-entry data than the codex panels render. Rather than trusting upstream to stay
 * stable, every script declares exactly which fields it wants and drops the rest — and prints
 * what it dropped, so a newly added upstream field is noticed instead of silently discarded.
 *
 * What stays in each script is the part that describes its own dataset: the field whitelists,
 * the paths, and which top-level keys it validates.
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.join(__dirname, '../..')

/**
 * Copy `object`'s whitelisted fields, recording every dropped path in `ignored`.
 */
function pickFields(
  object,
  fields,
  ignored,
  pathPrefix,
  { nestedFields = {}, sourceFields = {} } = {}
) {
  const picked = {}

  for (const [key, value] of Object.entries(object)) {
    if (!fields.includes(key)) {
      ignored.add(`${pathPrefix}.${key}`)
      continue
    }

    const nested = nestedFields[key]
    const sourceType = sourceFields[key]

    if (sourceType && Array.isArray(value)) {
      picked[key] = value.map((item) => toSource(item, sourceType, ignored, `${pathPrefix}.${key}`))
    } else if (nested && Array.isArray(value)) {
      picked[key] = value.map((item) =>
        pickFields(item, nested, ignored, `${pathPrefix}.${key}[]`, { nestedFields, sourceFields })
      )
    } else {
      picked[key] = value
    }
  }

  return picked
}

const SOURCE_DROP_FIELDS = ['guaranteed', 'pools']

/**
 * `{ [sourceType]: name, guaranteed, pools }` -> `{ sourceType, name, guaranteed, pools }`,
 * dropping anything else.
 *
 * Both drop fields are kept, and they are independent rather than two halves of one flag:
 * `guaranteed` means the source hands the card over outright, while a non-empty `pools` means it
 * can *also* be drawn as a chance from each of those pools. A source can be both — Alchemic Table
 * always offers a Healing Potion and also draws one from the Potion pool.
 */
function toSource(item, sourceType, ignored, pathPrefix) {
  for (const key of Object.keys(item)) {
    if (key !== sourceType && !SOURCE_DROP_FIELDS.includes(key)) {
      ignored.add(`${pathPrefix}[].${key}`)
    }
  }

  return {
    sourceType,
    name: item[sourceType],
    guaranteed: item.guaranteed ?? false,
    pools: item.pools ?? [],
  }
}

function writeJson(outputFile, data, label) {
  fs.writeFileSync(outputFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8')

  execFileSync('npx', ['prettier', '--write', '--log-level', 'warn', outputFile], {
    cwd: REPO_ROOT,
  })

  const sizeKb = (fs.statSync(outputFile).size / 1024).toFixed(2)
  console.log(`   ✅ ${data.length} ${label} -> ${outputFile} (${sizeKb} KB)`)
}

/**
 * `hint` names the constants in the calling script that a dropped field would be added to.
 */
function logIgnoredFields(ignored, hint) {
  if (ignored.size === 0) {
    console.log('\nNo fields were ignored — every field in the input is whitelisted.')
    return
  }

  console.log(`\nIgnored ${ignored.size} field(s):`)
  for (const field of Array.from(ignored).sort()) {
    console.log(`   - ${field}`)
  }
  console.log(`   Add them to ${hint} to start including them.`)
}

function readInputFile(inputFile, toolDescription) {
  if (!fs.existsSync(inputFile)) {
    throw new Error(
      `Input file not found: ${inputFile}\n` +
        `   ${toolDescription} and must be pasted in manually.`
    )
  }

  console.log('Reading data from', inputFile)

  return JSON.parse(fs.readFileSync(inputFile, 'utf8'))
}

function ensureOutputDir(outputDir) {
  if (!fs.existsSync(outputDir)) {
    console.log('Creating output directory:', outputDir)
    fs.mkdirSync(outputDir, { recursive: true })
  }
}

module.exports = {
  pickFields,
  writeJson,
  logIgnoredFields,
  readInputFile,
  ensureOutputDir,
}
