import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { AbracadabraImageUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'

import CardResultsPanel from './components/ResultsPanels/CardResultsPanel'
import { useAllCardSearchFilters } from './hooks/useSearchFilters'
import CardSearchPanel from './components/SearchPanels/CardSearchPanel'
import { useCardData } from './hooks/useCardData'
import CodexErrorMessage from './components/CodexErrorMessage'
import CodexLoadingMessage from './components/CodexLoadingMessage'
import styles from './cards.module.scss'

const cx = createCx(styles)

function Cards(): JSX.Element {
  const { resetToCardCodex } = useNavigation()
  const useCardDataHook = useCardData()
  const { cardData, isLoading, isError, progress } = useCardDataHook

  const useSearchFiltersHook = useAllCardSearchFilters(cardData)

  return (
    <div className={cx('container')}>
      <Header
        onLogoClick={resetToCardCodex}
        logoSrc={AbracadabraImageUrl}
        title="Dawn-Dash : Cardex"
        subtitle="Dawncaster cards codex"
        currentPage="cardex"
      />

      <div className={cx('content')}>
        <CodexLoadingMessage isVisible={isLoading} progress={progress} codexType="card" />
        <CodexErrorMessage isVisible={isError && !isLoading} />
        {!isError && !isLoading && (
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
    </div>
  )
}

export default Cards
