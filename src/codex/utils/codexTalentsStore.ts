import { CachedData } from '@/shared/types/cache'
import { CacheWriteResult, getFromCache, saveToCache } from '@/shared/utils/storage'

import { TalentTree } from '@/codex/types/talents'

const CACHE_VERSION = 'v7'
const CACHE_KEY = `codex_talents_${CACHE_VERSION}`
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 1 day

export function cacheTalentTree(talentTree: TalentTree): CacheWriteResult {
  return saveToCache(CACHE_KEY, talentTree)
}

export function getCachedTalentTree(): CachedData<TalentTree> {
  return getFromCache(CACHE_KEY, CACHE_DURATION)
}

export function getCachedTalentTreeTimestamp(): number | null {
  return getCachedTalentTree().timestamp
}
