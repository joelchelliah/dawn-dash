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
 *
 * Two kinds of array field get special treatment, both declared by the caller:
 * - `nestedFields` ({ fieldName: [allowedKeys] }) recurses, keeping the objects as objects.
 * - `sourceFields` ({ fieldName: sourceType }) normalizes a source list. Upstream names the entity
 *   after its kind (`event` / `card` / `talent`), which forces one type per field downstream; these
 *   are rewritten to a uniform `{ sourceType, name, pool }` so a single type covers all of them —
 *   the same shape `reachedBy` already arrives in.
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

/**
 * `{ [sourceType]: name, pool }` -> `{ sourceType, name, pool }`, dropping anything else.
 *
 * `pool` is deliberately kept even when null: null means the source hands the card over outright,
 * a named pool means it is only a chance from that pool, and the UI splits on exactly that.
 */
function toSource(item, sourceType, ignored, pathPrefix) {
  for (const key of Object.keys(item)) {
    if (key !== sourceType && key !== 'pool') ignored.add(`${pathPrefix}[].${key}`)
  }

  return { sourceType, name: item[sourceType], pool: item.pool ?? null }
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
