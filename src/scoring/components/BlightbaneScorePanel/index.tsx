import { createCx } from '@/shared/utils/classnames'

import { ChallengeData } from '@/codex/types/challenges'

import CollapsiblePanel from '../CollapsiblePanel'
import WeeklyPanel from '../WeeklyPanel'

import styles from './index.module.scss'

const cx = createCx(styles)

interface BlightbaneScorePanelProps {
  challengeData: ChallengeData | null
  isLoading: boolean
  isError: boolean
}

function BlightbaneScorePanel({
  challengeData,
  isLoading,
  isError,
}: BlightbaneScorePanelProps): JSX.Element {
  return (
    <CollapsiblePanel title="Blightbane Score" collapsible>
      <div className={cx('score-content')}>
        <WeeklyPanel challengeData={challengeData} isLoading={isLoading} isError={isError} />
      </div>
    </CollapsiblePanel>
  )
}

export default BlightbaneScorePanel
