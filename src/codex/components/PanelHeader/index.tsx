import { MagnifyingGlassIcon, StackedCardsIcon } from '@/shared/utils/icons'
import GradientDivider from '@/shared/components/GradientDivider'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface PanelHeaderProps {
  type: 'Search' | 'CardResults' | 'TalentResults' | 'EventResults'
}

const PanelHeader = ({ type }: PanelHeaderProps) => {
  const renderTitle = () => {
    if (type === 'Search') {
      return 'Search'
    } else if (type === 'CardResults') {
      return 'Cards'
    } else if (type === 'TalentResults') {
      return 'Talents'
    } else if (type === 'EventResults') {
      return 'Event'
    }

    return 'Results'
  }

  const renderIcon = () => {
    if (type === 'Search') {
      return <MagnifyingGlassIcon className={cx('panel-header__magnifying-glass-icon')} />
    } else {
      return <StackedCardsIcon className={cx('panel-header__cards-icon')} />
    }
  }

  return (
    <>
      <div className={cx('panel-header')}>
        {renderIcon()}
        <span className={cx('panel-header__title')}>{renderTitle()}</span>
      </div>
      <GradientDivider spacingBottom="lg" />
    </>
  )
}

export default PanelHeader
