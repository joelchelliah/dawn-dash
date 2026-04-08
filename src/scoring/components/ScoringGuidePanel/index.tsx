import { createCx } from '@/shared/utils/classnames'
import IllustratedButton from '@/shared/components/Buttons/IllustratedButton'
import {
  AdaptiveEdgeImageUrl,
  AuraOfPurityImageUrl,
  BigBombImageUrl,
} from '@/shared/utils/imageUrls'
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
    classType: CharacterClass.Warrior,
  },
  {
    mode: ScoringMode.Sunforge,
    label: 'Sunforge',
    imageUrl: AuraOfPurityImageUrl,
    classType: CharacterClass.Sunforge,
  },
  {
    mode: ScoringMode.WeeklyChallenge,
    label: 'The Weekly Challenge',
    imageUrl: BigBombImageUrl,
    classType: CharacterClass.Knight,
  },
]

function ScoringGuidePanel({ selectedMode, onModeChange }: ScoringGuidePanelProps): JSX.Element {
  return (
    <CollapsiblePanel>
      <div className={cx('content')}>
        <p className={cx('notice')}>
          🏆 An in-depth guide to maximizing your score in each game mode of{' '}
          <strong>Dawncaster</strong>. Select a <strong>game mode</strong> below to get started!
        </p>

        <div className={cx('buttons')}>
          {gameModeButtons.map((button) => (
            <IllustratedButton
              key={button.mode}
              imageUrl={button.imageUrl}
              label={button.label}
              isActive={selectedMode === button.mode}
              onClick={() => onModeChange(button.mode)}
              classType={button.classType}
            />
          ))}
        </div>
      </div>
    </CollapsiblePanel>
  )
}

export default ScoringGuidePanel
