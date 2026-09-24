import { SEARCH_QUERY_PARAM } from '@/codex/hooks/useCodexUrlParams'

const SKILLDEX_PATH = '/skilldex'

export const SkilldexTalentUrl = (name: string) =>
  `${SKILLDEX_PATH}?${SEARCH_QUERY_PARAM}=${encodeURIComponent(name)}`
