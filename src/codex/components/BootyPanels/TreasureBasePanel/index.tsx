import { createCx } from '@/shared/utils/classnames'

import PanelHeader, { PanelHeaderType } from '../../PanelHeader'

import styles from './index.module.scss'

const cx = createCx(styles)

interface TreasureBasePanelProps {
  type: Extract<PanelHeaderType, 'TreasureCards' | 'TreasurePools'>
  info?: React.ReactNode
  children: React.ReactNode
}

function TreasureBasePanel({ type, info, children }: TreasureBasePanelProps): JSX.Element {
  return (
    <div className={cx('treasure-panel')}>
      <div className={cx('treasure-panel__header')}>
        <PanelHeader type={type} />
      </div>

      <div className={cx('treasure-panel__container')}>
        {info && <div className={cx('treasure-panel__info')}>{info}</div>}
        {children}
      </div>
    </div>
  )
}

export default TreasureBasePanel
