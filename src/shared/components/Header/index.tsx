import { useState, useEffect, useRef } from 'react'

import { Link } from 'react-router-dom'
import cx from 'classnames'

import GradientLink from '../GradientLink'
import InfoModal from '../Modals/InfoModal'
import { HamburgerIcon } from '../../utils/icons'

import styles from './index.module.scss'

interface HeaderProps {
  onLogoClick: () => void
  logoSrc: string
  title: string
  subtitle: string
  currentPage: 'speedruns' | 'cardex'
}

const Header = ({ onLogoClick, logoSrc, title, subtitle, currentPage }: HeaderProps) => {
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
    <div className={styles['header']}>
      <div className={styles['logo-and-title']} onClick={onLogoClick}>
        <img src={logoSrc} alt="Header logo" className={styles['logo']} />
        <div>
          <h1 className={styles['title']}>{title}</h1>
          <h2 className={styles['subtitle']}>{subtitle}</h2>
        </div>
      </div>

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
              Speedruns
            </Link>
          </div>
          <div className={cardexLinkContainerClassNames}>
            <Link to="/codex/cards" className={styles['side-menu__nav-link']}>
              Cardex
            </Link>
          </div>
          <div className={styles['side-menu__nav-link-container']}>
            <Link
              to=""
              className={styles['side-menu__nav-link']}
              onClick={() => setIsAboutInfoOpen(true)}
            >
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
    </div>
  )
}

export default Header
