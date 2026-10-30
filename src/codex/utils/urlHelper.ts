import { SEARCH_QUERY_PARAM } from '@/codex/constants/urlParams'

const SKILLDEX_PATH = '/skilldex'

export const SkilldexTalentUrl = (name: string) =>
  `${SKILLDEX_PATH}?${SEARCH_QUERY_PARAM}=${encodeURIComponent(name)}`

export function normalizeEventNameForUrl(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_')
}
