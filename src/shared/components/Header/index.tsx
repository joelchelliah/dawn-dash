import { useState, useEffect, useRef } from 'react'

import { Link } from 'react-router-dom'

import GradientLink from '../GradientLink'
import InfoModal from '../Modals/InfoModal'
import { HamburgerIcon } from '../../utils/icons'

import styles from './index.module.scss'

interface HeaderProps {
  onLogoClick: () => void
  logoSrc: string
  title: string
  subtitle: string
}

const Header = ({ onLogoClick, logoSrc, title, subtitle }: HeaderProps) => {
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
          <div className={styles['side-menu__nav-link-container']}>
            <Link to="/" className={styles['side-menu__nav-link']}>
              Speedruns
            </Link>
          </div>
          <div className={styles['side-menu__nav-link-container']}>
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
          A search and tool for finding cards available in <b>Dawncaster</b>, with several options
          for filtering, tracking, and formatting the output.
        </p>
      </InfoModal>
    </div>
  )
}

export default Header
