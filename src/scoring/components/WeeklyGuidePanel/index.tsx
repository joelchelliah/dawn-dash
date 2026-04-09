import { GrimoireOfThunderImageUrl } from '@/shared/utils/imageUrls'
import { createCx } from '@/shared/utils/classnames'

import { ScoringMode } from '@/scoring/types'

import CollapsiblePanel from '../CollapsiblePanel'
import Highlight from '../Highlight'

import styles from './index.module.scss'

const cx = createCx(styles)

function WeeklyGuidePanel(): JSX.Element {
  return (
    <CollapsiblePanel
      title={'The Weekly Guide'}
      imageUrl={GrimoireOfThunderImageUrl}
      mode={ScoringMode.WeeklyChallenge}
      collapsible
      defaultExpanded
      isLongTitle
    >
      <div className={cx('content')}>
        <p>
          🤖 An auto-generated, super-optimized, score guide for the currently ongoing{' '}
          <Highlight mode={ScoringMode.WeeklyChallenge}>Weekly Challenge</Highlight>, covering all
          the <Highlight mode={ScoringMode.Blightbane}>Blightbane</Highlight> bonus objectives.
        </p>
        <p style={{ textAlign: 'center', width: '100%' }}>
          <strong>Coming soon!</strong>
        </p>
        <br />
        <br />
      </div>
    </CollapsiblePanel>
  )
}

export default WeeklyGuidePanel
