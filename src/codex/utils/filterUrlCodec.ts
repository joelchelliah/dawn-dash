import { SharedFilterOption } from '@/codex/types/filters'

const SEPARATOR = '.'
const ALL = 'all'
const NONE = 'none'

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
 * - `none` for an empty selection,
 * - no param at all for a full one.
 */
export const createFilterUrlCodec = (
  param: string,
  codesByOption: Record<string, number | string | (number | string)[]>
): FilterUrlCodec => {
  const options = Object.keys(codesByOption)
  const codesOf = (option: string) => [codesByOption[option]].flat().map(String)
  const optionByCode = new Map(
    options.flatMap((option) => codesOf(option).map((code) => [code.toLowerCase(), option]))
  )

  return {
    param,
    encode: (filters) => {
      const selected = options.filter((option) => filters[option])

      if (selected.length === options.length) return undefined
      if (selected.length === 0) return NONE

      return selected.map((option) => codesOf(option)[0]).join(SEPARATOR)
    },
    decode: (value) => {
      const normalized = value.trim().toLowerCase()

      if (normalized === ALL) return [SharedFilterOption.All]
      if (normalized === NONE) return [SharedFilterOption.None]

      const selected = new Set(
        normalized
          .split(SEPARATOR)
          .map((code) => optionByCode.get(code))
          .filter((option): option is string => option !== undefined)
      )

      // A stale or mangled value falls back to the default rather than showing an empty result
      if (selected.size === 0) return null
      // Passing the shared option keeps the "Select all" checkbox in sync with the others
      if (selected.size === options.length) return [SharedFilterOption.All]

      return Array.from(selected)
    },
  }
}
