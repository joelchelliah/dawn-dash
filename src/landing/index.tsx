import { useState } from 'react'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { DashImageUrl, HauntingNightmaresImageUrl } from '@/shared/utils/imageUrls'
import { LANDING_PAGE_NAV_ITEM_DESCRIPTIONS } from '@/shared/constants/descriptions'
import Footer from '@/shared/components/Footer'
import { useNavigation } from '@/shared/hooks/useNavigation'
import Header from '@/shared/components/Header'
import GradientLink from '@/shared/components/GradientLink'
import GradientDivider from '@/shared/components/GradientDivider'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import styles from './index.module.scss'
import NavItem from './NavItem'

const cx = createCx(styles)

export default function Landing() {
  const { resetToLandingPage } = useNavigation()
  const { isMobile } = useBreakpoint()
  const [hoveredItem, setHoveredItem] = useState<
    keyof typeof LANDING_PAGE_NAV_ITEM_DESCRIPTIONS | null
  >(null)

  return (
    <div className={cx('container')}>
      <Header
        onLogoClick={resetToLandingPage}
        logoSrc={DashImageUrl}
        title="Dawn-Dash"
        subtitle="Dawncaster tools and resources"
        currentPage="landing"
      />
      <div className={cx('content')}>
        <p className={cx('description')}>
          A collection of useful tools and resources for the RPG cardventure:{' '}
          <GradientLink text="Dawncaster" url="https://dawncaster.wanderlost.games/" />
        </p>

        <div style={{ width: '100%' }}>
          <GradientDivider spacingBottom="md" widthPercentage={85} />
        </div>

        <nav className={cx('nav')}>
          <NavItem
            url="/cardex"
            imageSrc="/landing-cardex.webp"
            alt="Cardex"
            mobileDescription={LANDING_PAGE_NAV_ITEM_DESCRIPTIONS.cardexShort}
            onMouseEnter={() => setHoveredItem('cardex')}
            onMouseLeave={() => setHoveredItem(null)}
            priority
          />
          <NavItem
            url="/skilldex"
            imageSrc="/landing-skilldex.webp"
            alt="Skilldex"
            mobileDescription={LANDING_PAGE_NAV_ITEM_DESCRIPTIONS.skilldexShort}
            onMouseEnter={() => setHoveredItem('skilldex')}
            onMouseLeave={() => setHoveredItem(null)}
          />
          <NavItem
            url="/eventmaps"
            imageSrc="/landing-eventmaps.webp"
            alt="Eventmaps"
            mobileDescription={LANDING_PAGE_NAV_ITEM_DESCRIPTIONS.eventmapsShort}
            onMouseEnter={() => setHoveredItem('eventmaps')}
            onMouseLeave={() => setHoveredItem(null)}
          />
          <NavItem
            url="/speedruns"
            imageSrc="/landing-speedruns.webp"
            alt="Speedruns"
            mobileDescription={LANDING_PAGE_NAV_ITEM_DESCRIPTIONS.speedrunsShort}
            onMouseEnter={() => setHoveredItem('speedruns')}
            onMouseLeave={() => setHoveredItem(null)}
          />
        </nav>

        {!hoveredItem && !isMobile && (
          <div className={cx('nav-description-placeholder')}>
            <span className={cx('boo-text')}>WAAH!</span>
            <Image
              src={HauntingNightmaresImageUrl}
              alt="Placeholder image"
              className={cx('image')}
              width={30}
              height={30}
            />
          </div>
        )}

        <div
          className={cx('nav-description-container', {
            'nav-description-container--visible': hoveredItem !== null,
          })}
        >
          {hoveredItem && (
            <p className={cx('nav-description-text')}>
              {LANDING_PAGE_NAV_ITEM_DESCRIPTIONS[hoveredItem]}
            </p>
          )}
        </div>
      </div>

      <div className={cx('footer-wrapper')}>
        <Footer />
      </div>
    </div>
  )
}
