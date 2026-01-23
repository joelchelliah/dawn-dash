import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'

import SideMenu from './SideMenu'
import styles from './index.module.scss'
import { CurrentPageType } from './types'

const cx = createCx(styles)

interface HeaderProps {
  onLogoClick: () => void
  logoSrc: string
  preTitle?: string
  title: string
  subtitle: string
  currentPage: CurrentPageType
}

const Header = ({ onLogoClick, logoSrc, preTitle, title, subtitle, currentPage }: HeaderProps) => {
  const isLandingPage = currentPage === 'landing'
  const preTitleElement = preTitle ? <span className={cx('pre-title')}>{preTitle}: </span> : null
  return (
    <div className={cx('header')}>
      <div className={styles['logo-and-title']} onClick={onLogoClick}>
        <Image src={logoSrc} alt="Header logo" className={cx('logo')} width={52} height={52} />
        <div>
          <h1 className={cx('title', { 'title--long': title.length > 20 })}>
            {preTitleElement}
            {title}
          </h1>
          <h2 className={cx('subtitle')}>{subtitle}</h2>
        </div>
      </div>

      {!isLandingPage && <SideMenu currentPage={currentPage} />}
    </div>
  )
}

export default Header
