import dynamic from 'next/dynamic'

import { createCx } from '@/shared/utils/classnames'
import { useNavigation } from '@/shared/hooks/useNavigation'
import { useScrollToTop } from '@/shared/hooks/useScrollToTop'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'
import { BootyImageUrl } from '@/shared/utils/imageUrls'
import Footer from '@/shared/components/Footer'
import Header from '@/shared/components/Header'
import ScrollToTopButton from '@/shared/components/ScrollToTopButton'
import StarField from '@/shared/components/StarField'

import styles from './booty.module.scss'

const TreasureCardsPanel = dynamic(() => import('./components/ResultsPanels/TreasureCardsPanel'), {
  loading: () => <div>Loading treasure cards...</div>,
})

const TreasurePoolsPanel = dynamic(() => import('./components/ResultsPanels/TreasurePoolsPanel'), {
  loading: () => <div>Loading treasure pools...</div>,
})

const cx = createCx(styles)

function useBootyScrollToTop() {
  const { isTabletOrSmaller } = useBreakpoint()
  return useScrollToTop(isTabletOrSmaller ? 750 : 1000)
}

function Booty(): JSX.Element {
  const { navigateTo } = useNavigation()
  const { showScrollToTopButton, scrollToTop } = useBootyScrollToTop()

  return (
    <div className={cx('container')}>
      <StarField position="upper" />
      <StarField position="lower" />
      <Header
        onLogoClick={() => navigateTo('booty')}
        logoSrc={BootyImageUrl}
        title="Booty"
        subtitle="Dawncaster treasures"
        currentPage="booty"
      />

      <div className={cx('content')}>
        <TreasureCardsPanel />
        <TreasurePoolsPanel />
      </div>

      <Footer />

      <ScrollToTopButton show={showScrollToTopButton} onClick={scrollToTop} />
    </div>
  )
}

export default Booty
