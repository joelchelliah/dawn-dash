import { MagnifyingGlassIcon, StackedCardsIcon } from '../../../shared/utils/icons'
import GradientDivider from '../../../shared/components/GradientDivider'

import styles from './index.module.scss'

interface PanelHeaderProps {
  type: 'Search' | 'Results'
}

const PanelHeader = ({ type }: PanelHeaderProps) => {
  const title = type === 'Search' ? 'Search' : 'Results'

  const renderIcon = () => {
    if (type === 'Search') {
      return <MagnifyingGlassIcon className={styles['panel-header__magnifying-glass-icon']} />
    } else {
      return <StackedCardsIcon className={styles['panel-header__cards-icon']} />
    }
  }

  return (
    <>
      <div className={styles['panel-header']}>
        {renderIcon()}
        <span className={styles['panel-header__title']}>{title}</span>
      </div>
      <GradientDivider spacingBottom="lg" />
    </>
  )
}

export default PanelHeader
