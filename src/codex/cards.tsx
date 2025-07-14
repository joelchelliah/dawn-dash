import { useNavigation } from '../shared/hooks/useNavigation'
import Footer from '../shared/components/Footer'
import Header from '../shared/components/Header'
import { AbracadabraImageUrl } from '../shared/utils/imageUrls'

import { useSearchFilters } from './hooks/useSearchFilters'
import { useCardData } from './hooks/useCardData'
import ResultsPanel from './components/ResultsPanel'
import SearchPanel from './components/SearchPanel'
import CodexLoadingMessage from './components/CodexLoadingMessage'
import CodexErrorMessage from './components/CodexErrorMessage'
import styles from './cards.module.scss'

function Cards(): JSX.Element {
  const { resetToCardCodex } = useNavigation()

  const useCardDataHook = useCardData()
  const { cardData, isLoading, isError, progress } = useCardDataHook

  const useSearchFiltersHook = useSearchFilters(cardData)

  return (
    <div className={styles['container']}>
      <Header
        onLogoClick={resetToCardCodex}
        logoSrc={AbracadabraImageUrl}
        title="Dawn-Dash : Cardex"
        subtitle="Dawncaster card codex"
        currentPage="cardex"
      />

      <div className={styles['content']}>
        <CodexLoadingMessage isVisible={isLoading} progress={progress} />
        <CodexErrorMessage isVisible={isError && !isLoading} />
        {!isError && !isLoading && (
          <>
            <SearchPanel useSearchFilters={useSearchFiltersHook} useCardData={useCardDataHook} />
            <ResultsPanel useSearchFilters={useSearchFiltersHook} />
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default Cards
