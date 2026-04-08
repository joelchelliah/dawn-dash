import {
  AdaptiveEdgeImageUrl,
  AnimaImageUrl,
  AuraOfPurityImageUrl,
  BigBombImageUrl,
} from '@/shared/utils/imageUrls'
import { createCx } from '@/shared/utils/classnames'

import { ScoringMode } from '@/scoring/types'

import CollapsiblePanel from '../CollapsiblePanel'

import styles from './index.module.scss'

const cx = createCx(styles)

type ExamplesPanelProps = {
  mode: ScoringMode
}

function ExamplesPanel({ mode }: ExamplesPanelProps): JSX.Element {
  const getImageUrl = () => {
    if (mode === ScoringMode.Standard) {
      return AdaptiveEdgeImageUrl
    } else if (mode === ScoringMode.Sunforge) {
      return AuraOfPurityImageUrl
    } else if (mode === ScoringMode.WeeklyChallenge) {
      return BigBombImageUrl
    }
    return AnimaImageUrl
  }

  return (
    <CollapsiblePanel
      title={'Scoring examples'}
      imageUrl={getImageUrl()}
      mode={mode}
      collapsible
      isLongTitle
    >
      <div className={cx('content')}>Examples here...</div>
    </CollapsiblePanel>
  )
}

export default ExamplesPanel
