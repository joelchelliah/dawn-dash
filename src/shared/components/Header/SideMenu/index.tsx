import { useState, useEffect, useRef } from 'react'

import Link from 'next/link'

import Image from '@/shared/components/Image'
import LoadingDots from '@/shared/components/LoadingDots'
import {
  HamburgerIcon,
  HamburgerMenuIcon,
  CloseIcon,
  CloseMenuIcon,
} from '@/shared/components/Icons'
import { InfernalContractUrl, RushedForgeryImageUrl } from '@/shared/utils/imageUrls'
import { createCx } from '@/shared/utils/classnames'
import GradientLink from '@/shared/components/GradientLink'
import InfoModal from '@/shared/components/Modals/InfoModal'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'
import { TOOL_REGISTRY, getTool } from '@/shared/config/toolRegistry'

import { CurrentPageType } from '../types'

import styles from './index.module.scss'

interface SideMenuProps {
  currentPage: CurrentPageType
}

const cx = createCx(styles)

const SideMenu = ({ currentPage }: SideMenuProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAboutInfoOpen, setIsAboutInfoOpen] = useState(false)
  const [loadingPage, setLoadingPage] = useState<string | null>(null)
  const { isMobile } = useBreakpoint()
  const menuRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleNavLinkClick = (page: string) => {
    if (currentPage.toLowerCase() !== page.toLowerCase()) {
      setLoadingPage(page)
    }
  }

  const getNavLinkImage = (url: string, alt: string, isHome?: boolean) => {
    const size = isHome ? 25 : 40
    return (
      <Image
        src={url}
        alt={alt}
        className={cx('side-menu__nav-link__icon')}
        width={size}
        height={size}
      />
    )
  }

  const getInfoTitle = (toolId: string) => {
    const tool = getTool(toolId)
    if (!tool) return null

    return (
      <h3 className={cx('info-title')}>
        {getNavLinkImage(tool.navIcon, `${tool.title} logo`)} {tool.title}
      </h3>
    )
  }

  const loadingColor = getClassColor(CharacterClass.Rogue, ClassColorVariant.Dark)

  const getNavLinkText = (name: string) =>
    loadingPage === name ? (
      <LoadingDots color={loadingColor} className={cx('side-menu__nav-link__loading-dots')} />
    ) : (
      name
    )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const landingLinkContainerClassNames = cx(
    'side-menu__nav-link-container',
    'side-menu__nav-link-container--home',
    {
      'side-menu__nav-link-container--active': currentPage === 'landing',
    }
  )

  const menuIcon = isMobile ? (
    isMenuOpen ? (
      <CloseIcon className={cx('hamburger__button__icon')} />
    ) : (
      <HamburgerIcon className={cx('hamburger__button__icon')} />
    )
  ) : isMenuOpen ? (
    <CloseMenuIcon className={cx('hamburger__button__icon')} />
  ) : (
    <HamburgerMenuIcon className={cx('hamburger__button__icon')} />
  )

  return (
    <>
      <div className={cx('hamburger', { 'hamburger--menu-open': isMenuOpen })}>
        <button
          ref={hamburgerRef}
          className={cx('hamburger__button')}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {menuIcon}
        </button>
      </div>

      <div
        ref={menuRef}
        className={cx('side-menu', {
          'side-menu--open': isMenuOpen,
        })}
      >
        <nav className={cx('side-menu__nav')}>
          <div className={landingLinkContainerClassNames}>
            <Link
              href="/"
              className={cx('side-menu__nav-link', 'side-menu__nav-link--home')}
              onClick={() => handleNavLinkClick('Home')}
            >
              {getNavLinkImage(InfernalContractUrl, 'Dawn-Dash logo', true)}
              {getNavLinkText('Home')}
            </Link>
          </div>

          {TOOL_REGISTRY.map((tool) => (
            <div
              key={tool.id}
              className={cx('side-menu__nav-link-container', {
                'side-menu__nav-link-container--active': currentPage === tool.id,
              })}
            >
              <Link
                href={tool.path}
                className={cx('side-menu__nav-link')}
                onClick={() => handleNavLinkClick(tool.title)}
              >
                {getNavLinkImage(tool.navIcon, `${tool.title} logo`)}
                {getNavLinkText(tool.title)}
              </Link>
            </div>
          ))}

          <div className={cx('side-menu__nav-link-container')}>
            <button className={cx('side-menu__nav-link')} onClick={() => setIsAboutInfoOpen(true)}>
              {getNavLinkImage(RushedForgeryImageUrl, 'About logo')}
              About
            </button>
          </div>
        </nav>
      </div>

      <InfoModal isOpen={isAboutInfoOpen} onClose={() => setIsAboutInfoOpen(false)} scrollable>
        {getInfoTitle('cardex')}

        <p className={cx('info-last-paragraph')}>
          A codex and multi-search tool for all the cards available in <b>Dawncaster</b>. Has
          several options for filtering, tracking, and formatting the output, to help you plan out
          your run!
        </p>

        <div className={cx('info-divider')} />

        {getInfoTitle('skilldex')}

        <p className={cx('info-last-paragraph')}>
          A codex and talent-tree vizualisation of all the talents and infernal offers available in{' '}
          <b>Dawncaster</b>. Includes several options to narrow down the results and track down the
          talents you need for your run!
        </p>

        <div className={cx('info-divider')} />

        {getInfoTitle('eventmaps')}

        <p className={cx('info-last-paragraph')}>
          Fully mapped out event trees for all events available in <b>Dawncaster</b>. See all
          dialogue options, along with their requirements and rewards, so that you can get the best
          outcome from each event!
        </p>

        <div className={cx('info-divider')} />

        {getInfoTitle('scoring')}

        <p className={cx('info-last-paragraph')}>
          Detailed <b>Dawncaster</b> scoring guides, for <strong>Standard</strong> mode,{' '}
          <strong>Sunforge</strong>, and the <strong>Weekly Challenges</strong>. Full breakdown of
          all scoring parameters, and how to maximize each one!
        </p>

        <div className={cx('info-divider')} />

        {getInfoTitle('speedruns')}

        <p>
          <b>Dawncaster</b> speedrun charts for all game modes and difficulties, based on
          player-submitted data from{' '}
          <GradientLink text="blightbane.io" url="https://blightbane.io/" />.
        </p>
        <p className={cx('info-last-paragraph')}>
          The player names linked to these runs are their Discord accounts from the official{' '}
          <GradientLink text="Dawncaster Discord" url="https://discord.gg/pfeMG9c" />.
        </p>
      </InfoModal>
    </>
  )
}

export default SideMenu
