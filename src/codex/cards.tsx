import { createCx } from '../shared/utils/classnames'
import Header from '../shared/components/Header'
import { useNavigation } from '../shared/hooks/useNavigation'
import Footer from '../shared/components/Footer'
import { AbracadabraImageUrl } from '../shared/utils/imageUrls'

import CardResultsPanel from './components/ResultsPanels/CardResultsPanel'
import { useCardSearchFilters } from './hooks/useSearchFilters'
import CardSearchPanel from './components/SearchPanels/CardSearchPanel'
import { useCardData } from './hooks/useCardData'
import CodexLoadingMessage from './components/CodexLoadingMessage'
import CodexErrorMessage from './components/CodexErrorMessage'
import styles from './cards.module.scss'

const cx = createCx(styles)

function Cards(): JSX.Element {
  const { resetToCardCodex } = useNavigation()
  const useCardDataHook = useCardData()
  const { cardData, isLoading, isError, progress } = useCardDataHook

  const useSearchFiltersHook = useCardSearchFilters(cardData)

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
        <CodexLoadingMessage isVisible={isLoading} progress={progress} />
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
