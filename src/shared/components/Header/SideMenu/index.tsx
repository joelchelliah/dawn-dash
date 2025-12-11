import { useState, useEffect, useRef } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { HamburgerIcon } from '@/shared/utils/icons'
import {
  AbracadabraImageUrl,
  DashImageUrl,
  EleganceImageUrl,
  RushedForgeryImageUrl,
} from '@/shared/utils/imageUrls'
import { createCx } from '@/shared/utils/classnames'
import GradientLink from '@/shared/components/GradientLink'
import InfoModal from '@/shared/components/Modals/InfoModal'

import styles from './index.module.scss'

interface SideMenuProps {
  currentPage: 'speedruns' | 'cardex' | 'skilldex'
}

const cx = createCx(styles)

const SideMenu = ({ currentPage }: SideMenuProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAboutInfoOpen, setIsAboutInfoOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const getNavLinkImage = (url: string, alt: string) => (
    <Image src={url} alt={alt} className={cx('side-menu__nav-link__icon')} width={40} height={40} />
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

  const speedrunsLinkContainerClassNames = cx('side-menu__nav-link-container', {
    'side-menu__nav-link-container--active': currentPage === 'speedruns',
  })
  const cardexLinkContainerClassNames = cx('side-menu__nav-link-container', {
    'side-menu__nav-link-container--active': currentPage === 'cardex',
  })
  const skilldexLinkContainerClassNames = cx('side-menu__nav-link-container', {
    'side-menu__nav-link-container--active': currentPage === 'skilldex',
  })

  return (
    <>
      <div className={cx('hamburger')}>
        <button
          ref={hamburgerRef}
          className={cx('hamburger__button')}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <HamburgerIcon className={cx('hamburger__button__icon')} />
        </button>
      </div>

      <div
        ref={menuRef}
        className={cx('side-menu', {
          'side-menu--open': isMenuOpen,
        })}
      >
        <nav className={cx('side-menu__nav')}>
          <div className={speedrunsLinkContainerClassNames}>
            <Link href="/" className={cx('side-menu__nav-link')}>
              {getNavLinkImage(DashImageUrl, 'Speedruns logo')}
              Speedruns
            </Link>
          </div>

          <div className={cardexLinkContainerClassNames}>
            <Link href="/codex/cards" className={cx('side-menu__nav-link')}>
              {getNavLinkImage(AbracadabraImageUrl, 'Cardex logo')}
              Cardex
            </Link>
          </div>

          <div className={skilldexLinkContainerClassNames}>
            <Link href="/codex/skills" className={cx('side-menu__nav-link')}>
              {getNavLinkImage(EleganceImageUrl, 'Skilldex logo')}
              Skilldex
            </Link>
          </div>

          <div className={cx('side-menu__nav-link-container')}>
            <Link
              href=""
              className={cx('side-menu__nav-link')}
              onClick={() => setIsAboutInfoOpen(true)}
            >
              {getNavLinkImage(RushedForgeryImageUrl, 'About logo')}
              About
            </Link>
          </div>
        </nav>
      </div>

      <InfoModal isOpen={isAboutInfoOpen} onClose={() => setIsAboutInfoOpen(false)}>
        <h3 className={cx('info-title')}>
          {getNavLinkImage(DashImageUrl, 'Speedruns logo')} Dawn-Dash
        </h3>

        <p>
          <b>Dawncaster</b> speedrun charts for all game modes and difficulties, based on
          player-submitted data from{' '}
          <GradientLink text="blightbane.io" url="https://blightbane.io/" />.
        </p>
        <p>
          The player names linked to these runs are their Discord accounts from the official{' '}
          <GradientLink text="Dawncaster Discord" url="https://discord.gg/pfeMG9c" />.
        </p>
        <div className={cx('info-divider')} />

        <h3 className={cx('info-title')}>
          {getNavLinkImage(AbracadabraImageUrl, 'Cardex logo')} Cardex
        </h3>

        <p className={cx('info-last-paragraph')}>
          A codex and multi-search tool for all the cards available in <b>Dawncaster</b>. Has
          several options for filtering, tracking, and formatting the output, to help you plan out
          your run!
        </p>

        <div className={cx('info-divider')} />

        <h3 className={cx('info-title')}>
          {getNavLinkImage(EleganceImageUrl, 'Skilldex logo')} Skilldex
        </h3>

        <p className={cx('info-last-paragraph')}>
          A codex and talent-tree-like vizualisation for all the talents and infernal offers
          available in <b>Dawncaster</b>. Also has some filtering and formatting options to narrow
          down the results!
        </p>
      </InfoModal>
    </>
  )
}

export default SideMenu
