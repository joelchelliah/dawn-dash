import { createCx } from '@/shared/utils/classnames'
import IllustratedButton from '@/shared/components/Buttons/IllustratedButton'
import {
  AdaptiveEdgeImageUrl,
  ArcaneMissileImageUrl,
  SunforgeImageUrl,
} from '@/shared/utils/imageUrls'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'

import { GameMode } from '../../types'
import CollapsiblePanel from '../CollapsiblePanel'
import Highlight from '../Highlight'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ScoringGuidePanelProps {
  selectedMode: GameMode
  onModeChange: (mode: GameMode) => void
}

const gameModeButtons = [
  {
    mode: GameMode.Standard,
    label: 'Standard',
    imageUrl: AdaptiveEdgeImageUrl,
  },
  {
    mode: GameMode.Sunforge,
    label: 'Sunforge',
    imageUrl: SunforgeImageUrl,
  },
  {
    mode: GameMode.WeeklyChallenge,
    label: 'The Weekly Challenge',
    imageUrl: ArcaneMissileImageUrl,
  },
]

const getButtonColor = (mode: GameMode, isActive: boolean): string => {
  switch (mode) {
    case GameMode.Standard:
      return getClassColor(
        isActive ? CharacterClass.Warrior : CharacterClass.Neutral,
        isActive ? ClassColorVariant.Lighter : ClassColorVariant.Default
      )
    case GameMode.Sunforge:
      return getClassColor(
        isActive ? CharacterClass.Sunforge : CharacterClass.Neutral,
        isActive ? ClassColorVariant.Light : ClassColorVariant.Dark
      )
    case GameMode.WeeklyChallenge:
      return getClassColor(
        isActive ? CharacterClass.Knight : CharacterClass.Neutral,
        isActive ? ClassColorVariant.Lighter : ClassColorVariant.Default
      )
  }
}

const getButtonBorderColor = (mode: GameMode, isActive: boolean): string => {
  switch (mode) {
    case GameMode.Standard:
      return getClassColor(
        isActive ? CharacterClass.Warrior : CharacterClass.Neutral,
        isActive ? ClassColorVariant.Lighter : ClassColorVariant.Dark
      )
    case GameMode.Sunforge:
      return getClassColor(
        isActive ? CharacterClass.Sunforge : CharacterClass.Neutral,
        isActive ? ClassColorVariant.Light : ClassColorVariant.Darker
      )
    case GameMode.WeeklyChallenge:
      return getClassColor(
        isActive ? CharacterClass.Knight : CharacterClass.Neutral,
        isActive ? ClassColorVariant.Lighter : ClassColorVariant.Dark
      )
  }
}

const getStandardModeContent = () => {
  return (
    <div className={cx('description')}>
      <p>
        The <Highlight mode={GameMode.Standard}>Standard</Highlight> scoring is based solely on the{' '}
        <strong>in-game scoring parameters</strong> which you see at the end of the run.
      </p>
    </div>
  )
}

const getSunforgeModeContent = () => {
  return (
    <div className={cx('description')}>
      <p>
        The <Highlight mode={GameMode.Sunforge}>Sunforge</Highlight> scoring is based on the same
        in-game scoring parameters as the <strong>Standard</strong> mode, but with an additional{' '}
        <strong>Sunforge score multiplier</strong> depending on how many rerolls you have left at
        the end of the run.
      </p>

      <p className={cx('notice')}>
        🚚 🚚 🚚 TODO: MOVE THIS TO IN-GAME SECTION?!
        <br />
        ℹ️ There are some tiny differences in the in-game scoring parameters between Sunforge and
        Standard mode, but the minimum and maximum values are still the same. So these differences
        will not be covered below.
      </p>
    </div>
  )
}

const getWeeklyChallengeModeContent = () => {
  return (
    <div className={cx('description')}>
      <p>Game mode info will be added here.</p>
    </div>
  )
}

function ScoringGuidePanel({ selectedMode, onModeChange }: ScoringGuidePanelProps): JSX.Element {
  return (
    <CollapsiblePanel>
      <div className={cx('content')}>
        <p className={cx('notice')}>
          🏆 An in-depth guide to maximizing your score in each game mode of{' '}
          <strong>Dawncaster</strong>. Select a game mode below to get started!
        </p>

        <div className={cx('buttons')}>
          {gameModeButtons.map((button) => (
            <IllustratedButton
              key={button.mode}
              imageUrl={button.imageUrl}
              label={button.label}
              isActive={selectedMode === button.mode}
              onClick={() => onModeChange(button.mode)}
              color={getButtonColor(button.mode, selectedMode === button.mode)}
              borderColor={getButtonBorderColor(button.mode, selectedMode === button.mode)}
            />
          ))}
        </div>

        {selectedMode === GameMode.Standard && getStandardModeContent()}
        {selectedMode === GameMode.Sunforge && getSunforgeModeContent()}
        {selectedMode === GameMode.WeeklyChallenge && getWeeklyChallengeModeContent()}
      </div>
    </CollapsiblePanel>
  )
}

export default ScoringGuidePanel
