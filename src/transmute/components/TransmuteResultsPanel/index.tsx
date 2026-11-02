import { createCx } from '@/shared/utils/classnames'
import PanelHeader from '@/shared/components/PanelHeader'

import styles from './index.module.scss'

const cx = createCx(styles)

const TransmuteResultsPanel = () => (
  <div className={cx('results-panel')}>
    <PanelHeader type="TransmuteResults" />
  </div>
)

export default TransmuteResultsPanel
