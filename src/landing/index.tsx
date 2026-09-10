import { CSSProperties, useState } from 'react'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { DashImageUrl, HauntingNightmaresImageUrl } from '@/shared/utils/imageUrls'
import { getListedTools, getTool } from '@/shared/config/toolRegistry'
import Footer from '@/shared/components/Footer'
import { useNavigation } from '@/shared/hooks/useNavigation'
import Header from '@/shared/components/Header'
import StarField from '@/shared/components/StarField'
import GradientLink from '@/shared/components/GradientLink'
import Divider from '@/shared/components/Divider'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import styles from './index.module.scss'
import NavItem from './NavItem'

const cx = createCx(styles)

// Nav items per row on desktop. Passed to the stylesheet as --nav-columns
const NAV_COLUMNS = 3
const COLUMNS_PER_ITEM = 2

export default function Landing() {
  const { resetToLandingPage } = useNavigation()
  const { isMobile } = useBreakpoint()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const tools = getListedTools()
  // An incomplete last row is centred by shifting the item that starts it.
  const lastRowCount = tools.length % NAV_COLUMNS
  const lastRowStartIndex = lastRowCount === 0 ? -1 : tools.length - lastRowCount
  const lastRowStart = ((NAV_COLUMNS - lastRowCount) * COLUMNS_PER_ITEM) / 2 + 1

  return (
    <div className={cx('container')}>
      <StarField position="upper" />
      <StarField position="lower" />
      <Header
        onLogoClick={resetToLandingPage}
        logoSrc={DashImageUrl}
        title="Dawn-Dash"
        subtitle="Dawncaster tools and resources"
        currentPage="landing"
      />
      <div className={cx('content')}>
        <p className={cx('description')}>
          A growing collection of useful tools and resources for{' '}
          <GradientLink text="Dawncaster" url="https://dawncaster.wanderlost.games/" />
        </p>

        <div style={{ width: '100%' }}>
          <Divider spacingBottom="md" widthPercentage={85} />
        </div>

        <nav className={cx('nav')} style={{ '--nav-columns': NAV_COLUMNS } as CSSProperties}>
          {tools.map((tool, index) => (
            <NavItem
              key={tool.id}
              url={tool.path}
              style={
                index === lastRowStartIndex
                  ? ({ '--nav-last-row-start': lastRowStart } as CSSProperties)
                  : undefined
              }
              imageSrc={tool.landingImage}
              alt={tool.title}
              mobileDescription={tool.shortDescription}
              onMouseEnter={() => setHoveredItem(tool.id)}
              onMouseLeave={() => setHoveredItem(null)}
              priority={index === 0}
            />
          ))}
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
            <p className={cx('nav-description-text')}>{getTool(hoveredItem)?.description}</p>
          )}
        </div>
      </div>

      <div className={cx('footer-wrapper')}>
        <Footer />
      </div>
    </div>
  )
}
