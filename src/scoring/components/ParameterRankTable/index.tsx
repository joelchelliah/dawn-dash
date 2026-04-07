import { useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { CharacterClass } from '@/shared/types/characterClass'
import Code from '@/shared/components/Code'

import { ScoringMode } from '@/scoring/types'

import ExampleBox from '../ExampleBox'
import Highlight from '../Highlight'
import SelectableScoringInfo, { SelectableItem } from '../SelectableScoringInfo'

import styles from './index.module.scss'
import SpoilerText from '../SpoilerText'
import GradientLink from '@/shared/components/GradientLink'

const cx = createCx(styles)

type ParameterId = 'bosses' | 'damage' | 'awareness' | 'lethality' | 'versatility' | 'wealth'

const MODE_TO_CLASS: Record<ScoringMode, CharacterClass> = {
  [ScoringMode.Standard]: CharacterClass.Warrior,
  [ScoringMode.Sunforge]: CharacterClass.Sunforge,
  [ScoringMode.WeeklyChallenge]: CharacterClass.Knight,
  [ScoringMode.Blightbane]: CharacterClass.Rogue,
}

const BOSSES_DIFFICULTY_DATA = [
  { difficulty: 'Impossible', bosses: 8, pointsPerBoss: 750, maxPoints: 6000 },
  { difficulty: 'Hard', bosses: 8, pointsPerBoss: 500, maxPoints: 4000 },
  { difficulty: 'Challenging', bosses: 7, pointsPerBoss: 200, maxPoints: 1400 },
  { difficulty: 'Normal', bosses: 7, pointsPerBoss: 100, maxPoints: 700 },
]

const PARAMETER_DETAILS = [
  {
    id: 'bosses' as const,
    emoji: '💀',
    title: 'Bosses defeated',
    standardDesc: (
      <span>
        This is the only parameter that scores differently across <strong>difficulty</strong>{' '}
        levels, giving you a higher bonus per kill depending on the difficulty of your current run.
        How the ranks are assigned for this parameter is not that relevant, as the score is just the
        sum of the points for each boss defeated, for the given difficulty.
      </span>
    ),
    sunforgeDesc: (
      <span>
        This parameter is scored solely based on the number of bosses defeated. The further you make
        it in the run, the more points you get per boss. How the ranks are assigned for this
        parameter is therefore not relevant.
        <br />
        <br />
        The max achievable score for this parameter is{' '}
        <Highlight mode={ScoringMode.Sunforge}>11,750</Highlight>, for killing all{' '}
        <strong>32 bosses</strong>.
      </span>
    ),
  },
  {
    id: 'damage' as const,
    emoji: '⚔️',
    title: 'Damage',
    description: (
      <span>
        Determined by the <strong>highest damage</strong> you do in a single instance. This can
        either be direct action damage, burning, bleed damage (not triggering damage + bleed), doom,
        etc. Any single source of damage will do.
        <br />
        <br />
        This parameter is ranked the same way for both{' '}
        <Highlight mode={ScoringMode.Standard}>Standard</Highlight> and{' '}
        <Highlight mode={ScoringMode.Sunforge}>Sunforge</Highlight>.
      </span>
    ),
    ranks: [
      { rank: 'IX', threshold: 'Over 5000 damage', points: 2000 },
      { rank: 'VIII', threshold: 'Over 2500 damage', points: 1500 },
      { rank: 'VII', threshold: 'Over 1500 damage', points: 1250 },
      { rank: 'VI', threshold: 'Over 1000 damage', points: 1000 },
      { rank: 'V', threshold: 'Over 250 damage', points: 750 },
      { rank: 'IV', threshold: 'Over 100 damage', points: 500 },
      { rank: 'III', threshold: 'Over 50 damage', points: 250 },
      { rank: 'II', threshold: 'Over 25 damage', points: 150 },
      { rank: 'I', threshold: '???', points: 100 },
    ],
  },
  {
    id: 'awareness' as const,
    emoji: '❤️',
    title: 'Awareness',
    description: (
      <span>
        Determined by the total <strong>damage taken </strong> throughout the entire run. This also
        includes self-inflicted damage and damage taken outside of combat. Loss of max health,
        either via enemy actions, malignancies, or events, doesn&apos;t count as damage taken.
        <br />
        <br />
        The max score for this is probably the hardest one to achieve, as it requires you to finish
        the entire run with no damage taken. This parameter is ranked the same way for both{' '}
        <Highlight mode={ScoringMode.Standard}>Standard</Highlight> and{' '}
        <Highlight mode={ScoringMode.Sunforge}>Sunforge</Highlight>.
      </span>
    ),
    ranks: [
      { rank: 'IX', threshold: '0 damage', points: 2000 },
      { rank: 'VIII', threshold: 'Under 25 damage', points: 1500 },
      { rank: 'VII', threshold: 'Under 50 damage', points: 1250 },
      { rank: 'VI', threshold: 'Under 100 damage', points: 750 },
      { rank: 'V', threshold: 'Under 250 damage', points: 500 },
      { rank: 'IV', threshold: 'Under 350 damage', points: 400 },
      { rank: 'III', threshold: 'Under 500 damage', points: 300 },
      { rank: 'II', threshold: 'Under 750 damage', points: 150 },
      { rank: 'I', threshold: 'Under 1000 damage', points: 50 },
    ],
  },
  {
    id: 'lethality' as const,
    emoji: '💨',
    title: 'Lethality',
    description: (
      <span>
        Determined by the <strong>average number of turns</strong> per fight. The easiest parameter
        to max out, hence its lower bonus. The exact rounding mechanism is unclear, but the
        calculated average appears to be rounded down when slightly above a whole number.
        <br />
        <br />
        This parameter is ranked the same way for both{' '}
        <Highlight mode={ScoringMode.Standard}>Standard</Highlight> and{' '}
        <Highlight mode={ScoringMode.Sunforge}>Sunforge</Highlight>.
      </span>
    ),
    ranks: [
      { rank: 'IX', threshold: '2 turns', points: 500 },
      { rank: 'VIII', threshold: '3 turns', points: 450 },
      { rank: 'VII', threshold: '4 turns', points: 400 },
      { rank: 'VI', threshold: '5 turns', points: 350 },
      { rank: 'V', threshold: '6 turns', points: 300 },
      { rank: 'IV', threshold: '7 turns', points: 250 },
      { rank: 'III', threshold: '8 turns', points: 200 },
      { rank: 'II', threshold: '???', points: 150 },
      { rank: 'I', threshold: '???', points: 100 },
    ],
  },
  {
    id: 'versatility' as const,
    emoji: '🃏',
    title: 'Versatility',
    description: (
      <span>
        Determined by the <strong>number of distinct cards</strong> in your deck.
      </span>
    ),
    standardDesc: (
      <span>
        Can easily be maxed out in <Highlight mode={ScoringMode.Standard}>Standard</Highlight> runs
        by picking up all rewards, actively using the shops, and/or playing several card-generating
        actions. Only limited by your own ability to manage your deck.
      </span>
    ),
    sunforgeDesc: (
      <span>
        A lot harder to score well in <Highlight mode={ScoringMode.Sunforge}>Sunforge</Highlight>{' '}
        compared to the other modes, as you have very few opportunities to pick up new cards outside
        of the drafting phase. Might even be impossible to max this out, since you only have a
        limited amount of battles to rely on any card-generation actions.
      </span>
    ),
    ranks: [
      { rank: 'IX', threshold: 'Over 100 cards', points: 2000 },
      { rank: 'VIII', threshold: 'Over 70 cards', points: 1750 },
      { rank: 'VII', threshold: 'Over 58 cards', points: 1500 },
      { rank: 'VI', threshold: 'Over 41 cards', points: 1000 },
      { rank: 'V', threshold: 'Over 30 cards', points: 750 },
      { rank: 'IV', threshold: 'Over 19 cards', points: 500 },
      { rank: 'III', threshold: 'Over 9 cards', points: 250 },
      { rank: 'II', threshold: 'Over 5 cards', points: 50 },
      { rank: 'I', threshold: '???', points: '???' },
    ],
  },
  {
    id: 'wealth' as const,
    emoji: '💰',
    title: 'Wealth',
    description: (
      <span>
        This can be tricky to understand as it&apos;s based on two separate components:{' '}
        <strong>Gold</strong> + <strong>Deck value</strong>. We will cover deck value in more detail
        below.
      </span>
    ),
    standardDesc: (
      <span>
        This parameter is ranked a lot more leniently in{' '}
        <Highlight mode={ScoringMode.Standard}>Standard</Highlight> mode compared to{' '}
        <Highlight mode={ScoringMode.Sunforge}>Sunforge</Highlight>. As we can see below, there is a
        near-linear progression at lower ranks, with only the upper two ranks being significantly
        more difficult to achieve:
      </span>
    ),
    sunforgeDesc: (
      <span>
        This parameter is ranked a lot stricter in{' '}
        <Highlight mode={ScoringMode.Sunforge}>Sunforge</Highlight> mode compared to{' '}
        <Highlight mode={ScoringMode.Standard}>Standard</Highlight>. As we can see below, there is a
        quite a high threshold even for the lower ranks, and a linear progression at higher ranks:
      </span>
    ),
    ranks: [
      { rank: 'IX', threshold: 'Over 5000 total', points: 2000 },
      { rank: 'VIII', threshold: 'Over 2500 total', points: 1500 },
      { rank: 'VII', threshold: 'Over 1500 total', points: 1250 },
      { rank: 'VI', threshold: 'Over 1000 total', points: 1000 },
      { rank: 'V', threshold: 'Over 750 total', points: 750 },
      { rank: 'IV', threshold: 'Over 400 total', points: 400 },
      { rank: 'III', threshold: 'Over 250 total', points: 350 },
      { rank: 'II', threshold: 'Over 150 total', points: 200 },
      { rank: 'I', threshold: '???', points: 100 },
    ],
    ranksSunforge: [
      { rank: 'IX', threshold: '???', points: 2000 },
      { rank: 'VIII', threshold: '???', points: 1500 },
      { rank: 'VII', threshold: 'Over 2500 total', points: 1250 },
      { rank: 'VI', threshold: 'Over 2000 total', points: 1000 },
      { rank: 'V', threshold: 'Over 1500 total', points: 750 },
      { rank: 'IV', threshold: 'Over 1000 total', points: 400 },
      { rank: 'III', threshold: 'Over 900 total', points: 350 },
      { rank: 'II', threshold: 'Over 800 total', points: 200 },
      { rank: 'I', threshold: '???', points: 100 },
    ],
  },
]

const CARD_VALUES = [
  { rarity: 'Legendary', baseValue: 50, valuableValue: 200 },
  { rarity: 'Rare', baseValue: 25, valuableValue: 100 },
  { rarity: 'Uncommon', baseValue: 10, valuableValue: 40 },
  { rarity: 'Common', baseValue: 5, valuableValue: 20 },
  { rarity: 'Monster', baseValue: 0, valuableValue: 0 },
]

interface ParameterRankTableProps {
  mode: ScoringMode
}

function ParameterRankTable({ mode }: ParameterRankTableProps): JSX.Element {
  const [selectedParameter, setSelectedParameter] = useState<ParameterId>('damage')

  const selectedParam = PARAMETER_DETAILS.find((p) => p.id === selectedParameter)
  const selectClass = MODE_TO_CLASS[mode]

  const selectOptions: SelectableItem<ParameterId>[] = PARAMETER_DETAILS.map((param) => ({
    value: param.id,
    label: param.title,
    emoji: param.emoji,
  }))

  const renderParameterBasedInfo = () => {
    if (!selectedParam) return null

    switch (selectedParam.id) {
      case 'bosses':
        if (mode === ScoringMode.Standard) {
          return (
            <ExampleBox emoji="👾" mode={mode}>
              <p>
                Having access to an 8th boss for the two hardest difficulties significantly
                increases the max achievable total score for <strong>Hard</strong> and{' '}
                <strong>Impossible</strong> runs compared to <strong>Normal</strong> and{' '}
                <strong>Challenging</strong>.
              </p>
            </ExampleBox>
          )
        }
        if (mode === ScoringMode.Sunforge) {
          return (
            <ExampleBox emoji="👾" mode={mode}>
              <p>
                The boss kill score most likely increases every time you clear a Portal. This is
                also how the game summary assigns a <strong>difficulty</strong> tag to your finished
                run.
              </p>
            </ExampleBox>
          )
        }
        return null

      case 'damage':
        return (
          <ExampleBox emoji="💥" mode={mode}>
            <p>
              Overkill damage counts as well! However, charm kills don&apos;t count as damage dealt,
              even with a high charm value. Slay and subjugation wins also don&apos;t count.
            </p>
          </ExampleBox>
        )

      case 'awareness':
        return (
          <ExampleBox emoji="🫀" mode={mode}>
            <p>
              Beware of effects/enchantments that can add <strong>Stagger</strong> or{' '}
              <strong>Poison</strong> to you before your first turn. This can ruin a perfect
              Awareness score, even when you are killing everything on turn 1.
            </p>
          </ExampleBox>
        )

      case 'lethality':
        return (
          <ExampleBox emoji="🤺" mode={mode}>
            <p>
              Note that whenever an enemy has <strong>First Strike</strong>, you are already
              starting that fight on turn 2. This is regardless of whether you have the{' '}
              <strong>Perception</strong> talent or not.
            </p>
          </ExampleBox>
        )

      case 'versatility':
        return (
          <ExampleBox emoji="🛒" mode={mode}>
            <p>
              Getting several copies of the same card will <strong>not</strong> affect this
              parameter at all! Only disctinct cards are counted.
            </p>
          </ExampleBox>
        )

      case 'wealth':
        return (
          <>
            <p>
              The <strong>Gold</strong> here, is just the amount of gold you have left at the end of
              your run. But to calculate the <strong>Deck value</strong>, you have to add together
              the value of each card in your deck, which is based on the card&apos;s rarity.
              <br />
              <br />
              Additionally, if a card has the <strong>Valuable</strong> keyword, its value is
              quadrupled!
            </p>
            <table className={cx('values-table')}>
              <thead>
                <tr>
                  <th className={cx(`mode--${mode}`)}>Card rarity</th>
                  <th className={cx(`mode--${mode}`)}>Base value</th>
                  <th className={cx(`mode--${mode}`)}>&quot;Valuable&quot; value</th>
                </tr>
              </thead>
              <tbody>
                {CARD_VALUES.map(({ rarity, baseValue, valuableValue }) => (
                  <tr key={rarity} className={cx(`mode--${mode}`)}>
                    <td className={cx('rarity')}>{rarity}</td>
                    <td className={cx('value')}>{baseValue}</td>
                    <td className={cx('value')}>{valuableValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <br />

            <ExampleBox emoji="💍" mode={mode}>
              <p>
                If you have 1 gold, how many copies of{' '}
                <GradientLink text="Ring of Power" url="https://blightbane.io/card/Ring_of_Power" />{' '}
                do you need to max out your <strong>Wealth</strong> bonus?
              </p>
              <SpoilerText mode={mode} label="Show answer">
                <strong>Answer:</strong> The Rings are <strong>Legendary</strong> and{' '}
                <strong>Valuable</strong>, so you will need <Highlight mode={mode}>25</Highlight>{' '}
                copies (<Code>25 × 4 × 50 + 1 = 5001</Code>).
              </SpoilerText>
            </ExampleBox>
          </>
        )

      default:
        return null
    }
  }

  const renderParameterContent = () => {
    if (!selectedParam) return null

    const ranksToDisplay =
      mode === ScoringMode.Sunforge && selectedParam.ranksSunforge
        ? selectedParam.ranksSunforge
        : selectedParam.ranks

    return (
      <>
        <h3 className={cx('parameter-title')}>
          {selectedParam.emoji} &nbsp; {selectedParam.title}
        </h3>
        {selectedParam.description && (
          <p className={cx('parameter-description')}>{selectedParam.description}</p>
        )}
        {selectedParam.standardDesc && mode === ScoringMode.Standard && (
          <p className={cx('parameter-description')}>{selectedParam.standardDesc}</p>
        )}
        {selectedParam.sunforgeDesc && mode === ScoringMode.Sunforge && (
          <p className={cx('parameter-description')}>{selectedParam.sunforgeDesc}</p>
        )}

        {selectedParam.id === 'bosses' && mode === ScoringMode.Standard ? (
          <div className={cx('bosses-content')}>
            <table className={cx('difficulty-table')}>
              <thead>
                <tr>
                  <th className={cx(`mode--${mode}`)}>Difficulty</th>
                  <th className={cx(`mode--${mode}`)}>Bosses available</th>
                  <th className={cx(`mode--${mode}`)}>Points per boss</th>
                  <th className={cx(`mode--${mode}`)}>Max score</th>
                </tr>
              </thead>
              <tbody>
                {BOSSES_DIFFICULTY_DATA.map(({ difficulty, bosses, pointsPerBoss, maxPoints }) => (
                  <tr key={difficulty} className={cx(`mode--${mode}`)}>
                    <td className={cx('difficulty-name')}>{difficulty}</td>
                    <td>{bosses}</td>
                    <td className={cx('value')}>{pointsPerBoss.toLocaleString()}</td>
                    <td className={cx('points', `points--${mode}`)}>
                      {maxPoints.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : ranksToDisplay ? (
          <table className={cx('ranks-table')}>
            <thead>
              <tr>
                <th className={cx(`mode--${mode}`)}>Rank</th>
                <th className={cx(`mode--${mode}`)}>Threshold</th>
                <th className={cx(`mode--${mode}`)}>Score</th>
              </tr>
            </thead>
            <tbody>
              {ranksToDisplay.map((rank) => (
                <tr key={rank.rank} className={cx(`mode--${mode}`)}>
                  <td className={cx('rank')}>{rank.rank}</td>
                  <td>{rank.threshold}</td>
                  <td className={cx('points', `points--${mode}`)}>
                    {rank.points.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {selectedParam && (
          <>
            <br />
          </>
        )}
        {renderParameterBasedInfo()}
      </>
    )
  }

  return (
    <SelectableScoringInfo
      mode={mode}
      selectedClass={selectClass}
      items={selectOptions}
      selectedValue={selectedParameter}
      onSelectChange={setSelectedParameter}
      selectLabel="Scoring parameter"
      renderContent={renderParameterContent}
    />
  )
}

export default ParameterRankTable
