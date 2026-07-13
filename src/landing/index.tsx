import { useState } from 'react'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { DashImageUrl, HauntingNightmaresImageUrl } from '@/shared/utils/imageUrls'
import { TOOL_REGISTRY } from '@/shared/config/toolRegistry'
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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

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
          A growing collection of useful tools and resources for{' '}
          <GradientLink text="Dawncaster" url="https://dawncaster.wanderlost.games/" />
        </p>

        <div style={{ width: '100%' }}>
          <GradientDivider spacingBottom="md" widthPercentage={85} />
        </div>

        <nav className={cx('nav')}>
          {TOOL_REGISTRY.map((tool, index) => (
            <NavItem
              key={tool.id}
              url={tool.path}
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
            <p className={cx('nav-description-text')}>
              {TOOL_REGISTRY.find((tool) => tool.id === hoveredItem)?.description}
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
