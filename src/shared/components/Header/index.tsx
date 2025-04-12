import { useState, useEffect, useRef } from 'react'

import { Link } from 'react-router-dom'

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

      <button
        ref={hamburgerRef}
        className={styles['hamburger']}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <HamburgerIcon />
      </button>

      <div
        ref={menuRef}
        className={`${styles['side-menu']} ${isMenuOpen ? styles['side-menu--open'] : ''}`}
      >
        <nav className={styles['nav']}>
          <Link to="/" className={styles['nav-link']}>
            Home
          </Link>
          <Link to="/about" className={styles['nav-link']}>
            About
          </Link>
          <Link to="/contact" className={styles['nav-link']}>
            Contact
          </Link>
        </nav>
      </div>
    </div>
  )
}

export default Header
