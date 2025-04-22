import { MagnifyingGlassIcon } from '../../../shared/utils/icons'
import GradientDivider from '../../../shared/components/GradientDivider'

import styles from './index.module.scss'

interface PanelHeaderProps {
  title: string
}

const PanelHeader = ({ title }: PanelHeaderProps) => {
  return (
    <>
      <div className={styles['panel-header']}>
        <MagnifyingGlassIcon className={styles['panel-header__magnifying-glass-icon']} />
        <span className={styles['panel-header__title']}>{title}</span>
      </div>
      <GradientDivider spacingBottom="lg" />
    </>
  )
}

export default PanelHeader
