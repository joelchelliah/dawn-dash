import { useState, useEffect, useRef } from 'react'

import { Link } from 'react-router-dom'
import cx from 'classnames'

import { HamburgerIcon } from '../../../utils/icons'
import { AbracadabraImageUrl, DashImageUrl, RushedForgeryImageUrl } from '../../../utils/imageUrls'
import GradientLink from '../../GradientLink'
import InfoModal from '../../Modals/InfoModal'

import styles from './index.module.scss'

interface SideMenuProps {
  currentPage: 'speedruns' | 'cardex' | 'skilldex'
}

const SideMenu = ({ currentPage }: SideMenuProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAboutInfoOpen, setIsAboutInfoOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

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

  const speedrunsLinkContainerClassNames = cx(
    styles['side-menu__nav-link-container'],
    currentPage === 'speedruns' ? styles['side-menu__nav-link-container--active'] : ''
  )
  const cardexLinkContainerClassNames = cx(
    styles['side-menu__nav-link-container'],
    currentPage === 'cardex' ? styles['side-menu__nav-link-container--active'] : ''
  )

  return (
    <>
      <div className={styles['hamburger']}>
        <button
          ref={hamburgerRef}
          className={styles['hamburger__button']}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <HamburgerIcon className={styles['hamburger__button__icon']} />
        </button>
      </div>

      <div
        ref={menuRef}
        className={`${styles['side-menu']} ${isMenuOpen ? styles['side-menu--open'] : ''}`}
      >
        <nav className={styles['side-menu__nav']}>
          <div className={speedrunsLinkContainerClassNames}>
            <Link to="/" className={styles['side-menu__nav-link']}>
              <img
                src={DashImageUrl}
                alt="Speedruns logo"
                className={styles['side-menu__nav-link__icon']}
              />
              Speedruns
            </Link>
          </div>

          <div className={cardexLinkContainerClassNames}>
            <Link to="/codex/cards" className={styles['side-menu__nav-link']}>
              <img
                src={AbracadabraImageUrl}
                alt="Cardex logo"
                className={styles['side-menu__nav-link__icon']}
              />
              Cardex
            </Link>
          </div>

          <div className={styles['side-menu__nav-link-container']}>
            <Link
              to=""
              className={styles['side-menu__nav-link']}
              onClick={() => setIsAboutInfoOpen(true)}
            >
              <img
                src={RushedForgeryImageUrl}
                alt="About logo"
                className={styles['side-menu__nav-link__icon']}
              />
              About
            </Link>
          </div>
        </nav>
      </div>

      <InfoModal isOpen={isAboutInfoOpen} onClose={() => setIsAboutInfoOpen(false)}>
        <h3>Dawn-Dash</h3>

        <p>
          <b>Dawncaster</b> speedrun charts for all game modes and difficulties, based on
          player-submitted data from{' '}
          <GradientLink text="blightbane.io" url="https://blightbane.io/" />.
        </p>
        <p>
          The player names linked to these runs are their Discord accounts from the official{' '}
          <GradientLink text="Dawncaster Discord" url="https://discord.gg/pfeMG9c" />.
        </p>
        <div className={styles['info-divider']} />

        <h3>Cardex</h3>

        <p className={styles['info-last-paragraph']}>
          A codex and multi-search tool for all the cards available in <b>Dawncaster</b>. Has
          several options for filtering, tracking, and formatting the output, to help you plan out
          your run!
        </p>
      </InfoModal>
    </>
  )
}

export default SideMenu
