import ResultsPanel from '../../codex/components/ResultsPanel'
import CardSearchPanel from '../../codex/components/SearchPanels/CardSearchPanel'
import { useCardSearchFilters } from '../../codex/hooks/useSearchFilters'
import CodexLoadingMessage from '../../codex/components/CodexLoadingMessage'
import CodexErrorMessage from '../../codex/components/CodexErrorMessage'
import { useNavigation } from '../../shared/hooks/useNavigation'
import Footer from '../../shared/components/Footer'
import { useCardData } from '../../codex/hooks/useCardData'
import Header from '../../shared/components/Header'
import { AbracadabraImageUrl } from '../../shared/utils/imageUrls'

import styles from './index.module.scss'

function CardCodex(): JSX.Element {
  const { resetToCardCodex } = useNavigation()

  const useCardDataHook = useCardData()
  const { cardData, isLoading, isError, progress } = useCardDataHook

  const useSearchFiltersHook = useCardSearchFilters(cardData)

  return (
    <div className={styles['container']}>
      <Header
        onLogoClick={resetToCardCodex}
        logoSrc={AbracadabraImageUrl}
        title="Dawn-Dash : Cardex"
        subtitle="Dawncaster card search & filter"
        currentPage="cardex"
      />

      <div className={styles['content']}>
        <CodexLoadingMessage isVisible={isLoading} progress={progress} />
        <CodexErrorMessage isVisible={isError && !isLoading} />
        {!isError && !isLoading && (
          <>
            <CardSearchPanel
              useSearchFilters={useSearchFiltersHook}
              useCardData={useCardDataHook}
            />
            <ResultsPanel useSearchFilters={useSearchFiltersHook} />
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default CardCodex
