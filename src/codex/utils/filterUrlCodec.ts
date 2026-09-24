import { SharedFilterOption } from '@/codex/types/filters'

const SEPARATOR = '.'
const RANGE = '-'
const ALL = 'all'
const NONE = 'none'
// `1.2` is as short as `1-2`, and easier to read
const MIN_RANGE_LENGTH = 3
const RANGE_PATTERN = /^(\d+)-(\d+)$/

export interface FilterUrlCodec {
  param: string
  /** `undefined` when every option is selected: absence of the param means "all". */
  encode: (filters: Record<string, boolean>) => string | undefined
  /** Keys for `enableFilters`, or `null` when nothing in the value is recognised. */
  decode: (value: string) => string[] | null
}

/**
 * URL encoding for one checkbox group:
 * - selected options joined by `.`,
 * - spans of 3+ consecutive options as `a-b` (numeric codes only),
 * - `none` for an empty selection,
 * - no param at all for a full one.
 *
 * Ranges skip gaps: consecutive means adjacent among the group's *options* sorted by code, not
 * `n + 1`, so an unused id never breaks a span. The flip side is that a range also covers any id
 * the game later assigns inside it — harmless while new ids are appended at the end.
 */
export const createFilterUrlCodec = (
  param: string,
  codesByOption: Record<string, number | string | (number | string)[]>
): FilterUrlCodec => {
  const codesOf = (option: string) => [codesByOption[option]].flat().map(String)
  const codeOf = (option: string) => codesOf(option)[0]

  const options = Object.keys(codesByOption)
  const isNumeric = options.every((option) => codesOf(option).every((code) => /^\d+$/.test(code)))
  if (isNumeric) options.sort((a, b) => Number(codeOf(a)) - Number(codeOf(b)))

  const optionByCode = new Map(
    options.flatMap((option) => codesOf(option).map((code) => [code.toLowerCase(), option]))
  )

  const encodeSpan = (span: string[]) =>
    isNumeric && span.length >= MIN_RANGE_LENGTH
      ? `${codeOf(span[0])}${RANGE}${codeOf(span[span.length - 1])}`
      : span.map(codeOf).join(SEPARATOR)

  // Every option with any code in the range, so the loop is bounded by the group, not the input
  const decodeRange = (from: number, to: number) =>
    options.filter((option) =>
      codesOf(option).some((code) => Number(code) >= from && Number(code) <= to)
    )

  const decodeToken = (token: string): string[] => {
    const range = isNumeric ? RANGE_PATTERN.exec(token) : null
    if (!range) {
      const option = optionByCode.get(token)
      return option ? [option] : []
    }

    const [from, to] = [Number(range[1]), Number(range[2])].sort((a, b) => a - b)
    return decodeRange(from, to)
  }

  return {
    param,
    encode: (filters) => {
      const selectedCount = options.filter((option) => filters[option]).length

      if (selectedCount === options.length) return undefined
      if (selectedCount === 0) return NONE

      // Split the ordered options into spans of consecutive selected ones
      const spans: string[][] = []
      options.forEach((option, i) => {
        if (!filters[option]) return
        if (i > 0 && filters[options[i - 1]]) spans[spans.length - 1].push(option)
        else spans.push([option])
      })

      return spans.map(encodeSpan).join(SEPARATOR)
    },
    decode: (value) => {
      const normalized = value.trim().toLowerCase()

      if (normalized === ALL) return [SharedFilterOption.All]
      if (normalized === NONE) return [SharedFilterOption.None]

      const selected = new Set(normalized.split(SEPARATOR).flatMap(decodeToken))

      // A stale or mangled value falls back to the default rather than showing an empty result
      if (selected.size === 0) return null
      // Passing the shared option keeps the "Select all" checkbox in sync with the others
      if (selected.size === options.length) return [SharedFilterOption.All]

      return Array.from(selected)
    },
  }
}
