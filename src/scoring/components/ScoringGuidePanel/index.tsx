import { createCx } from '@/shared/utils/classnames'
import IllustratedButton from '@/shared/components/Buttons/IllustratedButton'
import {
  AdaptiveEdgeImageUrl,
  ArcaneMissileImageUrl,
  SunforgeImageUrl,
} from '@/shared/utils/imageUrls'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'

import { ScoringMode } from '../../types'
import CollapsiblePanel from '../CollapsiblePanel'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ScoringGuidePanelProps {
  selectedMode: ScoringMode
  onModeChange: (mode: ScoringMode) => void
}

const gameModeButtons = [
  {
    mode: ScoringMode.Standard,
    label: 'Standard',
    imageUrl: AdaptiveEdgeImageUrl,
  },
  {
    mode: ScoringMode.Sunforge,
    label: 'Sunforge',
    imageUrl: SunforgeImageUrl,
  },
  {
    mode: ScoringMode.WeeklyChallenge,
    label: 'The Weekly Challenge',
    imageUrl: ArcaneMissileImageUrl,
  },
]

const getButtonColor = (mode: ScoringMode, isActive: boolean, isHover = false): string => {
  switch (mode) {
    case ScoringMode.Standard:
      return getClassColor(
        isActive || isHover ? CharacterClass.Warrior : CharacterClass.Neutral,
        isHover || isActive ? ClassColorVariant.Lighter : ClassColorVariant.Default
      )
    case ScoringMode.Sunforge:
      return getClassColor(
        isActive || isHover ? CharacterClass.Sunforge : CharacterClass.Neutral,
        isHover || isActive ? ClassColorVariant.Light : ClassColorVariant.Default
      )
    case ScoringMode.WeeklyChallenge:
      return getClassColor(
        isActive || isHover ? CharacterClass.Knight : CharacterClass.Neutral,
        isHover || isActive ? ClassColorVariant.Lighter : ClassColorVariant.Default
      )
    default:
      throw new Error(`Unknown game mode: ${mode}`)
  }
}

const getButtonBorderColor = (mode: ScoringMode, isActive: boolean): string => {
  switch (mode) {
    case ScoringMode.Standard:
      return getClassColor(
        isActive ? CharacterClass.Warrior : CharacterClass.Neutral,
        isActive ? ClassColorVariant.Lighter : ClassColorVariant.Dark
      )
    case ScoringMode.Sunforge:
      return getClassColor(
        isActive ? CharacterClass.Sunforge : CharacterClass.Neutral,
        isActive ? ClassColorVariant.Light : ClassColorVariant.Darker
      )
    case ScoringMode.WeeklyChallenge:
      return getClassColor(
        isActive ? CharacterClass.Knight : CharacterClass.Neutral,
        isActive ? ClassColorVariant.Lighter : ClassColorVariant.Dark
      )
    default:
      throw new Error(`Unknown game mode: ${mode}`)
  }
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
              hoverColor={getButtonColor(button.mode, selectedMode === button.mode, true)}
              borderColor={getButtonBorderColor(button.mode, selectedMode === button.mode)}
            />
          ))}
        </div>
      </div>
    </CollapsiblePanel>
  )
}

export default ScoringGuidePanel
