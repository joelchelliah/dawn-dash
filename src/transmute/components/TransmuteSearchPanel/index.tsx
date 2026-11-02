import { createCx } from '@/shared/utils/classnames'
import PanelHeader from '@/shared/components/PanelHeader'

import styles from './index.module.scss'

const cx = createCx(styles)

const TransmuteSearchPanel = () => (
  <div className={cx('search-panel')}>
    <PanelHeader type="Search" />
  </div>
)

export default TransmuteSearchPanel
