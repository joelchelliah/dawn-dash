import { CachedData } from '@/shared/types/cache'
import { getFromCache, saveToCache } from '@/shared/utils/storage'

import { TalentTree } from '@/codex/types/talents'

const CACHE_VERSION = 'v4'
const CACHE_KEY = `codex_talents_${CACHE_VERSION}`
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 1 day

export function cacheTalentTree(talentTree: TalentTree) {
  try {
    saveToCache(CACHE_KEY, talentTree)
  } catch (e) {
    console.warn('Failed to cache talents:', e)
  }
}

export function getCachedTalentTree(): CachedData<TalentTree> {
  return getFromCache(CACHE_KEY, CACHE_DURATION)
}

export function getCachedTalentTreeTimestamp(): number | null {
  return getCachedTalentTree().timestamp
}
