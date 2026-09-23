import { SEARCH_QUERY_PARAM } from '@/codex/hooks/useSearchQueryUrlParam'

const SKILLDEX_PATH = '/skilldex'

export const SkilldexTalentUrl = (name: string) =>
  `${SKILLDEX_PATH}?${SEARCH_QUERY_PARAM}=${encodeURIComponent(name)}`
