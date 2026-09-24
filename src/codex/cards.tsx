import dynamic from 'next/dynamic'

import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { AbracadabraImageUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import ScrollToTopButton from '@/shared/components/ScrollToTopButton'
import StarField from '@/shared/components/StarField'
import { useScrollToTop } from '@/shared/hooks/useScrollToTop'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import { useAllCardSearchFilters } from './hooks/useSearchFilters'
import { useCardData } from './hooks/useCardData'
import CodexErrorMessage from './components/CodexErrorMessage'
import CodexLoadingMessage from './components/CodexLoadingMessage'
import styles from './cards.module.scss'

const CardResultsPanel = dynamic(() => import('./components/ResultsPanels/CardResultsPanel'), {
  loading: () => <div>Loading cards...</div>,
})

const CardSearchPanel = dynamic(() => import('./components/SearchPanels/CardSearchPanel'), {
  loading: () => <div>Loading search filters...</div>,
})

const cx = createCx(styles)

function useCardsScrollToTop() {
  const { isTabletOrSmaller } = useBreakpoint()
  return useScrollToTop(isTabletOrSmaller ? 1750 : 1250)
}

function Cards(): JSX.Element {
  const { navigateTo } = useNavigation()
  const useCardDataHook = useCardData()
  const { cardData, isLoading, isError, progress } = useCardDataHook

  const useSearchFiltersHook = useAllCardSearchFilters(cardData)
  const { showScrollToTopButton, scrollToTop } = useCardsScrollToTop()

  /*
   * Arriving on `?weekly` holds the panel back until the challenge data also lands
   */
  const isWaitingForWeeklyChallenge =
    useSearchFiltersHook.isPendingWeeklyChallengeFromUrl &&
    useSearchFiltersHook.isWeelyChallengeLoading
  const isLoadingAnything = isLoading || isWaitingForWeeklyChallenge

  return (
    <div className={cx('container')}>
      <StarField position="upper" />
      <StarField position="lower" />
      <Header
        onLogoClick={() => navigateTo('cardex')}
        logoSrc={AbracadabraImageUrl}
        title="Cardex"
        subtitle="Dawncaster cards codex"
        currentPage="cardex"
      />

      <div className={cx('content')}>
        <CodexLoadingMessage
          isVisible={isLoadingAnything}
          progress={progress}
          codexType="card"
          isWaitingForWeeklyChallenge={!isLoading && isWaitingForWeeklyChallenge}
        />
        <CodexErrorMessage isVisible={isError && !isLoadingAnything} codexType="card" />
        {!isError && !isLoadingAnything && (
          <>
            <CardSearchPanel
              useSearchFilters={useSearchFiltersHook}
              useCardData={useCardDataHook}
            />
            <CardResultsPanel useSearchFilters={useSearchFiltersHook} />
          </>
        )}
      </div>

      <Footer />

      <ScrollToTopButton
        show={showScrollToTopButton && !isLoadingAnything && !isError}
        onClick={scrollToTop}
      />
    </div>
  )
}

export default Cards
