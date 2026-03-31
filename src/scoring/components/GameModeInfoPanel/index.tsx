import { createCx } from '@/shared/utils/classnames'

import CollapsiblePanel from '../CollapsiblePanel'
import { GameMode } from '../../types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface GameModeInfoPanelProps {
  mode: GameMode
}

const getTitle = (mode: GameMode) => {
  switch (mode) {
    case GameMode.Standard:
      return 'Standard Mode'
    case GameMode.Sunforge:
      return 'Sunforge Mode'
    case GameMode.WeeklyChallenge:
      return 'Weekly Challenge'
    default:
      throw new Error(`Unknown game mode: ${mode}`)
  }
}

const getStandardModeContent = () => {
  return (
    <div className={cx('mode-content')}>
      <p>Game mode info will be added here.</p>
    </div>
  )
}

const getSunforgeModeContent = () => {
  return (
    <div className={cx('mode-content')}>
      <p>Game mode info will be added here.</p>
    </div>
  )
}

const getWeeklyChallengeModeContent = () => {
  return (
    <div className={cx('mode-content')}>
      <p>Game mode info will be added here.</p>
    </div>
  )
}
function GameModeInfoPanel({ mode }: GameModeInfoPanelProps): JSX.Element {
  const title = `💯 ${getTitle(mode)} Scoring`

  return (
    <CollapsiblePanel title={title}>
      {mode === GameMode.Standard && getStandardModeContent()}
      {mode === GameMode.Sunforge && getSunforgeModeContent()}
      {mode === GameMode.WeeklyChallenge && getWeeklyChallengeModeContent()}
    </CollapsiblePanel>
  )
}

export default GameModeInfoPanel
