import { useEffect, useRef } from 'react'

import { useRouter } from 'next/router'

import { ScoringMode } from '../types'

const URL_PARAM_TO_MODE: Record<string, ScoringMode> = {
  standard: ScoringMode.Standard,
  sunforge: ScoringMode.Sunforge,
  weekly: ScoringMode.WeeklyChallenge,
}

const MODE_TO_URL_PARAM: Record<ScoringMode, string> = {
  [ScoringMode.Standard]: 'standard',
  [ScoringMode.Sunforge]: 'sunforge',
  [ScoringMode.WeeklyChallenge]: 'weekly',
  [ScoringMode.Blightbane]: 'weekly', // Blightbane is not a user-selectable mode, map to weekly
}

export function useUrlParams(
  selectedMode: ScoringMode,
  setSelectedMode: (mode: ScoringMode) => void
): void {
  const router = useRouter()
  const { mode: modeParam } = router.query
  const prevModeRef = useRef(selectedMode)
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const isModeChangeFromUI = selectedMode !== prevModeRef.current

    prevModeRef.current = selectedMode

    if (isModeChangeFromUI) {
      // Update URL when mode changes via UI
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)

      debounceTimeoutRef.current = setTimeout(() => {
        router.replace(
          {
            pathname: router.pathname,
            query: { mode: MODE_TO_URL_PARAM[selectedMode] },
          },
          undefined,
          { shallow: true }
        )
      }, 100)
    } else if (router.isReady) {
      // Only process URL params after router is ready to avoid hydration issues
      if (modeParam && typeof modeParam === 'string') {
        // Update mode from URL param
        const modeFromUrl = URL_PARAM_TO_MODE[modeParam.toLowerCase()]

        if (modeFromUrl && modeFromUrl !== selectedMode) {
          setSelectedMode(modeFromUrl)
        } else if (!modeFromUrl) {
          // Invalid mode param, reset to current valid mode
          router.replace(
            {
              pathname: router.pathname,
              query: { mode: MODE_TO_URL_PARAM[selectedMode] },
            },
            undefined,
            { shallow: true }
          )
        }
      } else if (!modeParam) {
        // No mode param in URL, set default
        router.replace(
          {
            pathname: router.pathname,
            query: { mode: MODE_TO_URL_PARAM[selectedMode] },
          },
          undefined,
          { shallow: true }
        )
      }
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
    // Omitting router.replace and router.pathname from deps since they're stable references from Next.js router
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMode, modeParam, setSelectedMode, router.isReady])
}
