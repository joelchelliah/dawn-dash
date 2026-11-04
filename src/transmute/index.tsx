import { useMemo } from 'react'

import dynamic from 'next/dynamic'

import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { AbracadabraImageUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import StarField from '@/shared/components/StarField'
import { useCardData } from '@/shared/hooks/useCardData'
import DataErrorMessage from '@/shared/components/DataErrorMessage'
import DataLoadingMessage from '@/shared/components/DataLoadingMessage'

import { useAllTransmuteSearchFilters } from './hooks/useSearchFilters/useAllTransmuteSearchFilters'
import { buildTransmuteCards } from './utils/transmuteCards'
import styles from './index.module.scss'

const TransmuteResultsPanel = dynamic(() => import('./components/TransmuteResultsPanel'), {
  loading: () => <div>Loading results...</div>,
})

const TransmuteSearchPanel = dynamic(() => import('./components/TransmuteSearchPanel'), {
  loading: () => <div>Loading search filters...</div>,
})

const cx = createCx(styles)

function Transmute(): JSX.Element {
  const { navigateTo } = useNavigation()
  const { cardData, isLoading, isError, progress } = useCardData()
  const useSearchFiltersHook = useAllTransmuteSearchFilters()
  const transmuteCards = useMemo(() => cardData && buildTransmuteCards(cardData), [cardData])

  return (
    <div className={cx('container')}>
      <StarField position="upper" />
      <StarField position="lower" />
      <Header
        onLogoClick={() => navigateTo('transmute')}
        logoSrc={AbracadabraImageUrl}
        title="Transmute"
        subtitle="Dawncaster card transmutes"
        currentPage="transmute"
      />

      <div className={cx('content')}>
        <DataLoadingMessage isVisible={isLoading} progress={progress} dataType="card" />
        <DataErrorMessage isVisible={isError && !isLoading} dataType="card" />
        {!isError && !isLoading && transmuteCards && (
          <>
            <TransmuteSearchPanel cards={transmuteCards} useSearchFilters={useSearchFiltersHook} />
            <TransmuteResultsPanel cards={transmuteCards} useSearchFilters={useSearchFiltersHook} />
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default Transmute
