import { MagnifyingGlassIcon, StackedCardsIcon } from '@/shared/components/Icons'
import GradientDivider from '@/shared/components/GradientDivider'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

export type PanelHeaderType =
  'Search' | 'CardResults' | 'TalentResults' | 'EventResults' | 'TreasureCards' | 'TreasurePools'

const PANEL_TITLES: Record<PanelHeaderType, string> = {
  Search: 'Search',
  CardResults: 'Cards',
  TalentResults: 'Talents',
  EventResults: 'Event',
  TreasureCards: 'Treasure cards',
  TreasurePools: 'Treasure pools',
}

interface PanelHeaderProps {
  type: PanelHeaderType
}

const PanelHeader = ({ type }: PanelHeaderProps) => {
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
        <span className={cx('panel-header__title')}>{PANEL_TITLES[type]}</span>
      </div>
      <GradientDivider spacingBottom="lg" />
    </>
  )
}

export default PanelHeader
