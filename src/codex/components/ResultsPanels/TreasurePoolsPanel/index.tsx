import { createCx } from '@/shared/utils/classnames'

import PanelHeader from '../../PanelHeader'

import styles from './index.module.scss'

const cx = createCx(styles)

const TreasurePoolsPanel = () => (
  <div className={cx('treasure-panel')}>
    <div className={cx('treasure-panel__header')}>
      <PanelHeader type="TreasurePools" />
    </div>

    <div className={cx('treasure-panel__container')}>
      <div className={cx('info-message')}>Coming soon?</div>
    </div>
  </div>
)

export default TreasurePoolsPanel
