import { useCallback } from 'react'

import { useRouter } from 'next/router'

const BOOTY_PATH = '/booty'

interface UseBootyCardUrlParam {
  cardNameInUrl: string | undefined
  selectCardAndUpdateUrl: (urlParam: string) => void
  clearCardInUrl: () => void
}

/**
 * The selected Booty card lives in the URL, not in the lists. Both lists derive their modal from
 * `cardNameInUrl` during render, so a cold load of `/booty/arcane_bow` opens the modal whenever
 * that list happens to mount — which matters because `booty.tsx` gates the weapons panel behind the
 * card fetch, so it does not exist for the first seconds of such a load.
 */
export function useBootyCardUrlParam(): UseBootyCardUrlParam {
  const router = useRouter()
  // On a static page the query is empty until the router is ready.
  const cardNameInUrl = router.isReady ? (router.query.card as string | undefined) : undefined

  const selectCardAndUpdateUrl = useCallback(
    (urlParam: string) => {
      // Shallow, so the page never unmounts and the ~3000 fetched cards are not refetched.
      router.push(`${BOOTY_PATH}/${urlParam}`, undefined, { shallow: true })
    },
    [router]
  )

  const clearCardInUrl = useCallback(() => {
    // Only navigate if we're not already on the base route (prevents losing focus).
    if (router.asPath !== BOOTY_PATH) {
      router.push(BOOTY_PATH, undefined, { shallow: true })
    }
  }, [router])

  return { cardNameInUrl, selectCardAndUpdateUrl, clearCardInUrl }
}
