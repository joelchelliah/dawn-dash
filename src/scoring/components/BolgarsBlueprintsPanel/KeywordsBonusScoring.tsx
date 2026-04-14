import { useMemo, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import Code from '@/shared/components/Code'
import GradientLink from '@/shared/components/GradientLink'
import InfoModal from '@/shared/components/Modals/InfoModal'

import { ScoringMode, WeeklyChallengeData } from '@/scoring/types'
import { getCardScoreScaledByRarity } from '@/scoring/utils/advancedScoring'

import Highlight from '../Highlight'
import ScoringList from '../ScoringList'
import ScoringTable, { ScoringTableColumn } from '../ScoringTable'
import ScoringButton from '../ScoringButton'

import styles from './index.module.scss'

const cx = createCx(styles)

interface KeywordsBonusScoringProps {
  challengeData: WeeklyChallengeData
}

function KeywordsBonusScoring({ challengeData }: KeywordsBonusScoringProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { scoring } = challengeData
  const { cardBaseValue, diminishingReturnsLimit, calculationType, keywords } = scoring
  const isScoringAvailable = calculationType === 'DiminishingReturns'

  const uncommonScore = getCardScoreScaledByRarity('Uncommon', cardBaseValue)
  const rareScore = getCardScoreScaledByRarity('Rare', cardBaseValue)
  const legendaryScore = getCardScoreScaledByRarity('Legendary', cardBaseValue)

  const getRow = (rarity: string, base: number) => ({
    rarity,
    base: Math.ceil(base),
    c2: Math.ceil(base * 0.5),
    c3: Math.ceil(base * 0.25),
    c4: Math.ceil(base * 0.125),
    c5: Math.ceil(base * 0.0625),
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
    ],
    [cardBaseValue, uncommonScore, rareScore, legendaryScore]
  )

  if (!isScoringAvailable) {
    return (
      <div className={cx('unavailable')}>
        <p>
          ⚠️ The score calculation type for this challenge is &quot;
          <strong>{calculationType}</strong>&quot;. This section is not yet supported for that type.
        </p>
      </div>
    )
  }

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

  return (
    <div className={cx('scoring-container')}>
      <p>
        This bonus scales with your <strong>malignancy level</strong>! The keywords bonus settings
        are:
      </p>
      <ScoringList
        mode={ScoringMode.Blightbane}
        items={[
          <>
            <strong>Keywords:</strong> {listScoringKeywords()}
          </>,
          <>
            <strong>Card base value:</strong>{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {cardBaseValue}
            </Highlight>{' '}
            {cardBaseValue < 0 ? <em>(negative score)</em> : ''}
          </>,
          <>
            <strong>
              Diminishing returns limit:{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {diminishingReturnsLimit}
              </Highlight>
            </strong>
          </>,
        ]}
      />
      <ScoringButton
        mode={ScoringMode.Blightbane}
        onClick={() => setIsModalOpen(true)}
        className={cx('explain-settings-button')}
      >
        Explain these settings
      </ScoringButton>
      <ScoringTable
        mode={ScoringMode.Blightbane}
        columns={scoreTableColumns}
        data={scoreTableData}
        className={cx('table')}
      />
      <p>
        Example <strong>malignancy level</strong> scaling for a <strong>Legendary</strong> card
        bonus (
        <Code>
          <strong>{legendaryScore}</strong>
        </Code>
        ):
      </p>
      <ScoringList
        mode={ScoringMode.Blightbane}
        items={[
          <>
            <strong>+50% :</strong>{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {Math.ceil(legendaryScore * 1.5)}
            </Highlight>
          </>,
          <>
            <strong>+100% :</strong>{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {Math.ceil(legendaryScore * 2)}
            </Highlight>
          </>,
          <>
            <strong>+200% :</strong>{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {Math.ceil(legendaryScore * 3)}
            </Highlight>
          </>,
        ]}
      />
      <p>
        <strong>Hint:</strong> The{' '}
        <span className={cx('meta')}>
          <GradientLink text="Dawn-Dash: Cardex" url="https://dawn-dash.com/cardex" />
        </span>{' '}
        can help you find cards matching these keywords!
      </p>

      <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h4 className={cx('explain-settings-header')}>📝 &nbsp;Keywords bonuses settings</h4>

        <div className={cx('explain-settings-item-header')}>
          Base value:{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {cardBaseValue}
          </Highlight>
        </div>
        <p>
          A <strong>Common</strong> card matching the weekly keywords is worth{' '}
          <Highlight mode={ScoringMode.Blightbane}>{cardBaseValue}</Highlight> base points. Each
          rarity level above common is worth <strong>50%</strong> more than the previous one.
        </p>
        <hr className={cx('divider')} />

        <div className={cx('explain-settings-item-header')}>
          Diminishing returns limit:{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {diminishingReturnsLimit}
          </Highlight>
        </div>
        <p>
          Only your first{' '}
          <Highlight mode={ScoringMode.Blightbane}>{diminishingReturnsLimit}</Highlight> copies of
          each matching card are scored, with each additional copy being scored{' '}
          <strong>half</strong> as much as the previous copy.
          <br />
          All other copies beyond that are <strong>not</strong> scored.
        </p>
      </InfoModal>
    </div>
  )
}

export default KeywordsBonusScoring
