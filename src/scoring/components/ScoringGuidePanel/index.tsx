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

function getButtonColor(mode: GameMode, isActive: boolean): string {
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

function getButtonBorderColor(mode: GameMode, isActive: boolean): string {
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

function ScoringGuidePanel({ selectedMode, onModeChange }: ScoringGuidePanelProps): JSX.Element {
  return (
    <CollapsiblePanel>
      <div className={cx('guide-content')}>
        <p className={cx('notice')}>
          An in-depth guide to maximizing your score in each game mode of{' '}
          <strong>Dawncaster</strong>. Select a game mode below to get started!
        </p>

        <div className={cx('mode-buttons')}>
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
      </div>
    </CollapsiblePanel>
  )
}

export default ScoringGuidePanel
