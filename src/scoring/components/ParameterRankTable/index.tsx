import { useState } from 'react'

import ScrollableWithFade from '@/shared/components/ScrollableWithFade'
import { createCx } from '@/shared/utils/classnames'
import Code from '@/shared/components/Code'

import { GameMode } from '@/scoring/types'

import ExampleBox from '../ExampleBox'

import styles from './index.module.scss'

const cx = createCx(styles)

type ParameterId = 'bosses' | 'damage' | 'awareness' | 'lethality' | 'versatility' | 'wealth'

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
    description: (
      <span>
        This is the only parameter that scores differently across <strong>difficulty</strong>{' '}
        levels, giving you a higher bonus per kill depending on the difficulty of your current run.
        How the ranks are assigned for this parameter is not that relevant, as the score is just the
        sum of the points for each boss defeated, for the given difficulty.
        <br />
        <br />
        Having access to an 8th boss for the two hardest difficulties significantly increases the
        max achievable total score for <strong>Hard</strong> and <strong>Impossible</strong> runs
        compared to <strong>Normal</strong> and <strong>Challenging</strong>.
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
      { rank: 'I', threshold: 'Any damage', points: 100 },
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
        the entire run with no damage taken. It gets more lenient at lower ranks.
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
      { rank: 'II', threshold: '9 turns', points: 150 },
      { rank: 'I', threshold: '10+ turns', points: 100 },
    ],
  },
  {
    id: 'versatility' as const,
    emoji: '🃏',
    title: 'Versatility',
    description: (
      <span>
        Determined by the <strong>number of distinct cards</strong> in your deck. Can easily be
        maxed out in <strong>Regular</strong> runs by picking up all rewards, actively using the
        shops, or playing several card-generating actions. Only limited by your own ability to
        manage your inventory.
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
      { rank: 'II', threshold: 'Over 5 cards', points: 100 },
      { rank: 'I', threshold: 'Any number of cards', points: 50 },
    ],
  },
  {
    id: 'wealth' as const,
    emoji: '💰',
    title: 'Wealth',
    description: (
      <span>
        This can be tricky to understand as it&apos;s based on two separate components:{' '}
        <strong>Gold</strong> + <strong>Deck value</strong>. We will cover Deck value in more detail
        below.
      </span>
    ),
    ranks: [
      { rank: 'IX', threshold: 'Over 5000 total', points: 2000 },
      { rank: 'VIII', threshold: 'Over 2500 total', points: 1500 },
      { rank: 'VII', threshold: 'Over 1500 total', points: 1250 },
      { rank: 'VI', threshold: 'Over 1000 total', points: 1000 },
      { rank: 'V', threshold: 'Over 700 total', points: 750 },
      { rank: 'IV', threshold: 'Over 400 total', points: 400 },
      { rank: 'III', threshold: 'Over 250 total', points: 300 },
      { rank: 'II', threshold: 'Over 150 total', points: 200 },
      { rank: 'I', threshold: 'Any amount', points: '???' },
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

const MAX_HEIGHT = '450px'
const SCROLL_BOTTOM_OFFSET = 125

interface ParameterRankTableProps {
  mode: GameMode
}

function ParameterRankTable({ mode }: ParameterRankTableProps): JSX.Element {
  const [selectedParameter, setSelectedParameter] = useState<ParameterId>('damage')

  const selectedParam = PARAMETER_DETAILS.find((p) => p.id === selectedParameter)

  return (
    <div className={cx('parameter-selector-container')}>
      <div className={cx('columns')}>
        <div className={cx('left-column')}>
          <ul className={cx('parameter-list')}>
            {PARAMETER_DETAILS.map((param) => (
              <li
                key={param.id}
                className={cx('parameter-item', `parameter-item--${mode}`, {
                  active: selectedParameter === param.id,
                })}
                onClick={() => setSelectedParameter(param.id)}
              >
                <span className={cx('parameter-emoji')}>{param.emoji}</span>
                <span className={cx('parameter-name')}>{param.title}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={cx('right-column')}>
          {selectedParam && (
            <ScrollableWithFade
              maxHeight={MAX_HEIGHT}
              fadeColor="rgba(0, 0, 0, 1.75)"
              scrollBottomOffset={SCROLL_BOTTOM_OFFSET}
            >
              <div className={cx('parameter-details')}>
                <h3 className={cx('parameter-title')}>
                  {selectedParam.emoji} &nbsp; {selectedParam.title}
                </h3>
                <p className={cx('parameter-description')}>{selectedParam.description}</p>

                {selectedParam.id === 'bosses' ? (
                  <div className={cx('bosses-content')}>
                    <table className={cx('difficulty-table')}>
                      <thead>
                        <tr>
                          <th>Difficulty</th>
                          <th>Bosses available</th>
                          <th>Points per boss</th>
                          <th>Max score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {BOSSES_DIFFICULTY_DATA.map(
                          ({ difficulty, bosses, pointsPerBoss, maxPoints }) => (
                            <tr key={difficulty}>
                              <td className={cx('difficulty-name')}>{difficulty}</td>
                              <td>{bosses}</td>
                              <td className={cx('points')}>{pointsPerBoss.toLocaleString()}</td>
                              <td className={cx('points')}>{maxPoints.toLocaleString()}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : selectedParam.ranks ? (
                  <table className={cx('ranks-table')}>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Threshold</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedParam.ranks.map((rank) => (
                        <tr key={rank.rank}>
                          <td className={cx('rank')}>{rank.rank}</td>
                          <td>{rank.threshold}</td>
                          <td className={cx('points')}>{rank.points.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}

                {selectedParam.id === 'damage' && (
                  <div>
                    <br />
                    <ExampleBox emoji="💥">
                      <p>
                        Overkill damage counts as well! However, charm kills don&apos;t count as
                        damage dealt, even with a high charm value. Slay and subjugation wins also
                        don&apos;t count.
                      </p>
                    </ExampleBox>
                  </div>
                )}

                {selectedParam.id === 'awareness' && (
                  <div>
                    <br />
                    <ExampleBox emoji="🫀">
                      <p>
                        Beware of effects/enchantments that can add <strong>Stagger</strong> or{' '}
                        <strong>Poison</strong> to you before your first turn. This can ruin a
                        perfect Awareness score, even when you are killing everything on turn 1.
                      </p>
                    </ExampleBox>
                  </div>
                )}

                {selectedParam.id === 'lethality' && (
                  <div>
                    <br />
                    <ExampleBox emoji="🤺">
                      <p>
                        Note that whenever an enemy has <strong>First Strike</strong>, you are
                        already starting that fight on turn 2. This is regardless of whether you
                        have the <strong>Perception</strong> talent or not.
                      </p>
                    </ExampleBox>
                  </div>
                )}

                {selectedParam.id === 'versatility' && (
                  <div>
                    <br />
                    <ExampleBox emoji="🛒">
                      <p>
                        Getting several copies of the same card will <strong>not</strong> affect
                        this parameter at all! Only disctinct cards are counted.
                      </p>
                    </ExampleBox>
                  </div>
                )}

                {selectedParam.id === 'wealth' && (
                  <div>
                    <p>
                      <br />
                      The <strong>Gold</strong> here, is just the amount of gold you have left at
                      the end of your run. But to calculate the <strong>Deck value</strong>, you
                      have to add together the value of each card in your deck, which is based on
                      the card&apos;s rarity.
                      <br />
                      <br />
                      Additionally, if a card has the <strong>Valuable</strong> keyword, its value
                      is quadrupled!
                    </p>
                    <br />
                    <table className={cx('values-table')}>
                      <thead>
                        <tr>
                          <th>Card rarity</th>
                          <th>Base value</th>
                          <th>&quot;Valuable&quot; value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CARD_VALUES.map(({ rarity, baseValue, valuableValue }) => (
                          <tr key={rarity}>
                            <td className={cx('rarity')}>{rarity}</td>
                            <td className={cx('value')}>{baseValue}</td>
                            <td className={cx('value')}>{valuableValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <br />
                    <br />

                    <ExampleBox emoji="💍">
                      <p>
                        Let&apos;s say you have 1 gold. How many <strong>Ring of Power</strong> do
                        you need to max out your <strong>Wealth</strong> bonus?
                      </p>
                      <p>
                        <strong>Answer: 25</strong> (<Code>25 × 4 × 50 + 1 = 5001</Code>)
                      </p>
                    </ExampleBox>
                  </div>
                )}
              </div>
            </ScrollableWithFade>
          )}
        </div>
      </div>
    </div>
  )
}

export default ParameterRankTable
