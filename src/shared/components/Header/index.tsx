import SideMenu from './SideMenu'
import styles from './index.module.scss'

interface HeaderProps {
  onLogoClick: () => void
  logoSrc: string
  title: string
  subtitle: string
  currentPage: 'speedruns' | 'cardex' | 'skilldex'
}

const Header = ({ onLogoClick, logoSrc, title, subtitle, currentPage }: HeaderProps) => {
  return (
    <div className={styles['header']}>
      <div className={styles['logo-and-title']} onClick={onLogoClick}>
        <img src={logoSrc} alt="Header logo" className={styles['logo']} />
        <div>
          <h1 className={styles['title']}>{title}</h1>
          <h2 className={styles['subtitle']}>{subtitle}</h2>
        </div>
      </div>

      <SideMenu currentPage={currentPage} />
    </div>
  )
}

export default Header
