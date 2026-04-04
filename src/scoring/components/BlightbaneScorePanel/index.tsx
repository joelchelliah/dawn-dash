import { createCx } from '@/shared/utils/classnames'
import { AnimaImageUrl } from '@/shared/utils/imageUrls'

import { ScoringMode } from '@/scoring/types'

import CollapsiblePanel from '../CollapsiblePanel'
import Highlight from '../Highlight'

import styles from './index.module.scss'

const cx = createCx(styles)

function BlightbaneScorePanel(): JSX.Element {
  const mode = ScoringMode.Blightbane

  return (
    <CollapsiblePanel
      title={'Blightbane Score'}
      imageUrl={AnimaImageUrl}
      mode={mode}
      collapsible
      defaultExpanded
      isLongTitle
    >
      <div className={cx('content')}>
        <p>
          Your <Highlight mode={mode}>Blightbane</Highlight> score is determined by the following
          two factors:
        </p>
      </div>
    </CollapsiblePanel>
  )
}

export default BlightbaneScorePanel
