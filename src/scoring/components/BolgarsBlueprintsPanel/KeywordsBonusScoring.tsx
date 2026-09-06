import { useMemo, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import Code from '@/shared/components/Code'
import GradientLink from '@/shared/components/GradientLink'
import InfoModal from '@/shared/components/Modals/InfoModal'

import { ScoringMode, WeeklyChallengeData } from '@/scoring/types'
import { getCardScoreScaledByRarity } from '@/scoring/utils/advancedScoring'
import { DUPLICATE_SCORE_MULTIPLIER } from '@/scoring/constants/scoring'

import Highlight from '../Highlight'
import ScoringList from '../ScoringList'
import ScoringTable, { ScoringTableColumn } from '../ScoringTable'
import ScoringButton from '../ScoringButton'
import RarityScoringList from '../RarityScoringList'

import MalignancyScalingList from './MalignancyScalingList'
import styles from './index.module.scss'

const cx = createCx(styles)

interface KeywordsBonusScoringProps {
  challengeData: WeeklyChallengeData
}

function KeywordsBonusScoring({ challengeData }: KeywordsBonusScoringProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { scoring } = challengeData
  const { cardBaseValue, diminishingReturnsLimit, calculationType, keywords, lowestXAmount } =
    scoring

  const uncommonScore = getCardScoreScaledByRarity('Uncommon', cardBaseValue)
  const rareScore = getCardScoreScaledByRarity('Rare', cardBaseValue)
  const legendaryScore = getCardScoreScaledByRarity('Legendary', cardBaseValue)
  const monsterScore = cardBaseValue

  const getRow = (rarity: string, base: number) => ({
    rarity,
    base: Math.ceil(base),
    c2: Math.ceil(base * DUPLICATE_SCORE_MULTIPLIER),
    c3: Math.ceil(base * DUPLICATE_SCORE_MULTIPLIER ** 2),
    c4: Math.ceil(base * DUPLICATE_SCORE_MULTIPLIER ** 3),
    c5: Math.ceil(base * DUPLICATE_SCORE_MULTIPLIER ** 4),
  })

  const scoreTableColumns = useMemo(
    () =>
      [
        { header: 'Card rarity', accessor: 'rarity', className: 'bold' },
        { header: 'Base score', accessor: 'base', className: 'highlighted' },
        diminishingReturnsLimit > 1 ? { header: '2nd copy', accessor: 'c2' } : null,
        diminishingReturnsLimit > 2 ? { header: '3rd copy', accessor: 'c3' } : null,
        diminishingReturnsLimit > 3 ? { header: '4th copy', accessor: 'c4' } : null,
        diminishingReturnsLimit > 4 ? { header: '5th copy', accessor: 'c5' } : null,
      ].filter(Boolean) as ScoringTableColumn<{ [x: string]: unknown }>[],
    [diminishingReturnsLimit]
  )

  const scoreTableData = useMemo(
    () => [
      getRow('Common', cardBaseValue),
      getRow('Uncommon', uncommonScore),
      getRow('Rare', rareScore),
      getRow('Legendary', legendaryScore),
      getRow('Monster', monsterScore),
    ],
    [cardBaseValue, uncommonScore, rareScore, legendaryScore, monsterScore]
  )

  const listScoringKeywords = () => {
    if (keywords.length === 0) {
      return (
        <span>
          <strong>❌</strong>
        </span>
      )
    }

    return keywords.map((keyword, index) => (
      <span key={keyword}>
        <Code>
          <Highlight mode={ScoringMode.Blightbane} strong>
            {keyword}
          </Highlight>
        </Code>
        {index < keywords.length - 1 && (index === keywords.length - 2 ? ' and ' : ', ')}
      </span>
    ))
  }

  const getCalculationTypeHint = (calculationType: string) => {
    if (calculationType === 'Simple') {
      return 'Duplicates get full score'
    }
    if (calculationType === 'DiminishingReturns') {
      return '50% score reduction for duplicates'
    }
    if (calculationType === 'LowestX') {
      return 'Only lowest X cards are scored'
    }

    return '⚠️ Unknown calculation type'
  }

  return (
    <div className={cx('scoring-container')}>
      <p>
        These bonuses scale with your <strong>malignancy level</strong>.
      </p>
      <ScoringList mode={ScoringMode.Blightbane}>
        {calculationType !== 'LowestX' && (
          <li>
            <strong>Keywords:</strong> {listScoringKeywords()}
          </li>
        )}
        <li>
          <strong>Calculation type:</strong>{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {calculationType}
          </Highlight>{' '}
          <span className={cx('small-text-hint')}>
            ( {getCalculationTypeHint(calculationType)} )
          </span>
        </li>
        <li>
          <strong>Card base value:</strong>{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {cardBaseValue}
          </Highlight>{' '}
          {cardBaseValue < 0 ? <em>(negative score)</em> : ''}
        </li>
        {calculationType === 'DiminishingReturns' && (
          <li>
            <strong>
              Diminishing returns limit:{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {diminishingReturnsLimit}
              </Highlight>
            </strong>
          </li>
        )}
      </ScoringList>
      <ScoringButton
        mode={ScoringMode.Blightbane}
        onClick={() => setIsModalOpen(true)}
        className={cx('explain-settings-button')}
      >
        Explain these settings
      </ScoringButton>
      {calculationType === 'DiminishingReturns' ? (
        <>
          <span>
            <strong>Rarity</strong>-based scaling (with diminishing returns):
          </span>
          <ScoringTable
            mode={ScoringMode.Blightbane}
            columns={scoreTableColumns}
            data={scoreTableData}
            className={cx('table')}
          />
        </>
      ) : (
        <>
          <p>
            <strong>Rarity</strong>-based scaling:
          </p>
          <RarityScoringList mode={ScoringMode.Blightbane} />
        </>
      )}

      <p>
        <strong>Malignancy</strong>-based scaling for a <strong>Legendary</strong> card bonus (
        <Code>
          <strong>{legendaryScore}</strong>
        </Code>
        ):
      </p>
      <MalignancyScalingList baseValue={legendaryScore} />
      {cardBaseValue > 0 && keywords.length > 0 && (
        <p className={cx('cardex-hint')}>
          <strong>Hint:</strong> Find all keyword-matching cards on{' '}
          <GradientLink text="Dawn-Dash: Cardex" url="https://dawn-dash.com/cardex" />!
        </p>
      )}

      <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h4 className={cx('explain-settings-header')}>📝 &nbsp;Keywords bonuses settings</h4>

        <div className={cx('explain-settings-item-header')}>
          Calculation type:{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {calculationType}
          </Highlight>
        </div>
        <p>
          {calculationType === 'Simple' && (
            <>
              No <strong>50% reduction</strong> for several copies of the same keyword-matching
              cards. Each copy is scored at full value.
            </>
          )}
          {calculationType === 'DiminishingReturns' && (
            <>
              Each duplicate keyword-matching card is scored at <strong>50%</strong> of its previous
              copy. Score diminishes for each additional copy of that card.
            </>
          )}
          {calculationType === 'LowestX' && (
            <>
              Only the <strong>lowest rarity</strong> X cards are scored. There are no bonus
              keywords for this mode. Only card rarity matters.
            </>
          )}
        </p>

        <hr className={cx('divider')} />

        <div className={cx('explain-settings-item-header')}>
          Base value:{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {cardBaseValue}
          </Highlight>
        </div>
        <p>
          A <strong>Common</strong> card matching the weekly keywords is worth{' '}
          <Highlight mode={ScoringMode.Blightbane}>{cardBaseValue}</Highlight> base points. Each
          rarity level above common is worth <strong>50%</strong> more than the rarity below.
        </p>

        {calculationType === 'DiminishingReturns' && (
          <>
            <hr className={cx('divider')} />

            <div className={cx('explain-settings-item-header')}>
              Diminishing returns limit:{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {diminishingReturnsLimit}
              </Highlight>
            </div>
            <p>
              Only your first{' '}
              <Highlight mode={ScoringMode.Blightbane}>{diminishingReturnsLimit}</Highlight> copies
              of each matching card are scored, with diminishing value per copy. All other copies
              beyond that are <strong>not</strong> scored.
            </p>
          </>
        )}
        {calculationType === 'LowestX' && (
          <>
            <hr className={cx('divider')} />

            <div className={cx('explain-settings-item-header')}>
              Lowest X amount:{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {lowestXAmount}
              </Highlight>
            </div>
            <p>
              Only the <Highlight mode={ScoringMode.Blightbane}>{lowestXAmount}</Highlight>{' '}
              <strong>lowest rarity</strong> cards are scored. All other cards are ignored.
            </p>
          </>
        )}
      </InfoModal>
    </div>
  )
}

export default KeywordsBonusScoring
