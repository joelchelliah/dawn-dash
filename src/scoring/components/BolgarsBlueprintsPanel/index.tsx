import { useEffect, useState } from 'react'

import { format } from 'date-fns'

import { BolgarCreatureImageUrl } from '@/shared/utils/imageUrls'
import { createCx } from '@/shared/utils/classnames'
import LoadingDots from '@/shared/components/LoadingDots'
import GradientLink from '@/shared/components/GradientLink'
import Code from '@/shared/components/Code'
import InfoModal from '@/shared/components/Modals/InfoModal'

import { ScoringMode, WeeklyChallengeData } from '@/scoring/types'
import { useWeeklyChallengeData } from '@/scoring/hooks/useWeeklyChallengeData'
import { findCombinationJustAbove, getCardRarityMultiplier } from '@/scoring/utils/advancedScoring'

import Highlight from '../Highlight'
import CollapsiblePanel from '../CollapsiblePanel'
import ParameterInfoList from '../ParameterInfoList'
import ScoringList from '../ScoringList'
import ScoringTable, { ScoringTableColumn } from '../ScoringTable'
import ScoringButton from '../ScoringButton'

import styles from './index.module.scss'

const cx = createCx(styles)

const formatDate = (date: string) => format(new Date(date), 'MMM d, yyyy')

const getFixedValueScoringEmoji = (action: string) => {
  switch (action) {
    case 'DeckContainsCard':
      return '🃏'
    case 'PointsPerCard':
      return '🗂️'
    case 'PointsPerUpgrade':
      return '🛠️'
    case 'DefeatSpecificBoss':
      return '👺'
    case 'UseSpecificMalignancy':
      return '🦠'
    case 'Victory':
      return '🏆'
    default:
      return '❗'
  }
}

const getFixedValueScoringDescription = (action: string, keyword: string, pointLimit: number) => {
  const pointLimitPostfix =
    pointLimit > 1 ? (
      <span className={cx('fixed-value-scoring-point-limit-postfix')}>
        {' '}
        (up to max <Highlight mode={ScoringMode.Blightbane}>{pointLimit}</Highlight> points)
      </span>
    ) : (
      ''
    )
  switch (action) {
    case 'DeckContainsCard':
      return (
        <>
          For having a{' '}
          {<GradientLink text={keyword} url={`https://blightbane.io/card/${keyword}`} />} in your
          deck.
        </>
      )
    case 'PointsPerCard':
      return (
        <>
          For each copy of{' '}
          {<GradientLink text={keyword} url={`https://blightbane.io/card/${keyword}`} />} in your
          deck
          {pointLimitPostfix}.
        </>
      )
    case 'PointsPerUpgrade':
      return (
        <>
          For each upgrade on <strong>{keyword}</strong> in your deck.
        </>
      )
    case 'DefeatSpecificBoss':
      return 'You defeat a specific boss'
    case 'UseSpecificMalignancy':
      return <>You use a specific malignancy.</>
    case 'Victory':
      return (
        <>
          For completing <strong>the final encounter</strong>.
        </>
      )
    default:
      return `${action} (${keyword})`
  }
}

const getFixedValueScoringParameters = ({ scoring }: WeeklyChallengeData) =>
  scoring.fixedValueScoring.map((item) => ({
    emoji: getFixedValueScoringEmoji(item.action),
    label: (
      <>
        <Highlight mode={ScoringMode.Blightbane} strong>
          {item.pointValue}
        </Highlight>{' '}
        <strong>points</strong>{' '}
      </>
    ),
    description: (
      <span className={cx('fixed-value-scoring-description')}>
        {getFixedValueScoringDescription(item.action, item.keyword, item.pointLimit)}
      </span>
    ),
  }))

function BolgarsBlueprintsPanel(): JSX.Element {
  const { challengeData, isLoading, isError } = useWeeklyChallengeData()
  const [isKeywordsSettingsModalOpen, setIsKeywordsSettingsModalOpen] = useState(false)
  const [isAccuracySettingsModalOpen, setIsAccuracySettingsModalOpen] = useState(false)
  const [currentScoreParams, setCurrentScoreParams] = useState<{
    cardBaseValue: number
    diminishingReturnsLimit: number
    accuracyBaseValue: number
    allowNegativeAccuracy: boolean
    target: number
    buffer: number
  }>({
    cardBaseValue: challengeData?.scoring.cardBaseValue ?? 0,
    diminishingReturnsLimit: challengeData?.scoring.diminishingReturnsLimit ?? 0,
    accuracyBaseValue: challengeData?.scoring.accuracyBaseValue ?? 0,
    allowNegativeAccuracy: challengeData?.scoring.allowNegativeAccuracy ?? false,
    target: challengeData?.scoring.target ?? 0,
    buffer: challengeData?.scoring.buffer ?? 0,
  })

  useEffect(() => {
    if (!challengeData) return

    setCurrentScoreParams({
      cardBaseValue: challengeData.scoring.cardBaseValue,
      diminishingReturnsLimit: challengeData.scoring.diminishingReturnsLimit,
      accuracyBaseValue: challengeData.scoring.accuracyBaseValue,
      allowNegativeAccuracy: challengeData.scoring.allowNegativeAccuracy,
      target: challengeData.scoring.target,
      buffer: challengeData.scoring.buffer,
    })
  }, [challengeData])

  const renderUnsupportedSectionText = (calculationType: string) => (
    <p>
      ⚠️ <strong>Whoops!</strong> The score calculation type for this challenge is &quot;
      <strong>{calculationType}</strong>&quot;. This section is not yet supported for that type.
    </p>
  )

  const renderKeywordsScoringBonus = ({ scoring }: WeeklyChallengeData) => {
    if (scoring.calculationType !== 'DiminishingReturns') {
      return renderUnsupportedSectionText(scoring.calculationType)
    }

    const { cardBaseValue, diminishingReturnsLimit } = scoring
    const uncommonScore = cardBaseValue * getCardRarityMultiplier('Uncommon')
    const rareScore = cardBaseValue * getCardRarityMultiplier('Rare')
    const legendaryScore = cardBaseValue * getCardRarityMultiplier('Legendary')

    const getRow = (rarity: string, base: number) => ({
      rarity,
      base: Math.round(base),
      c2: Math.round(base * 0.5),
      c3: Math.round(base * 0.25),
      c4: Math.round(base * 0.125),
      c5: Math.round(base * 0.0625),
    })

    const scoreTableColumns = [
      { header: 'Card rarity', accessor: 'rarity', className: 'bold' },
      { header: 'Base score', accessor: 'base', className: 'highlighted' },
      diminishingReturnsLimit > 1 ? { header: '2nd copy', accessor: 'c2' } : null,
      diminishingReturnsLimit > 2 ? { header: '3rd copy', accessor: 'c3' } : null,
      diminishingReturnsLimit > 3 ? { header: '4th copy', accessor: 'c4' } : null,
      diminishingReturnsLimit > 4 ? { header: '5th copy', accessor: 'c5' } : null,
    ].filter(Boolean) as ScoringTableColumn<{ [x: string]: unknown }>[]

    const scoreTableData = [
      getRow('Common', cardBaseValue),
      getRow('Uncommon', uncommonScore),
      getRow('Rare', rareScore),
      getRow('Legendary', legendaryScore),
    ]
    return (
      <>
        <p>
          These bonuses will scale with your <strong>malignancy level</strong> and{' '}
          <strong>rarity</strong>! The keywords score settings are:
        </p>
        <ScoringList
          mode={ScoringMode.Blightbane}
          items={[
            <>
              <strong>Keywords:</strong>{' '}
              {scoring.keywords.map((keyword, index) => (
                <span key={keyword}>
                  <Code>
                    <strong>{keyword}</strong>
                  </Code>
                  {index < scoring.keywords.length - 1 &&
                    (index === scoring.keywords.length - 2 ? ' and ' : ' , ')}
                </span>
              ))}
            </>,
            <>
              <strong>Card base value:</strong>{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {scoring.cardBaseValue}
              </Highlight>
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
          onClick={() => setIsKeywordsSettingsModalOpen(true)}
          className={cx('explain-settings-button')}
        >
          Explain these settings
        </ScoringButton>
        <ScoringTable
          mode={ScoringMode.Blightbane}
          columns={scoreTableColumns}
          data={scoreTableData}
          className={cx('keywords-scoring-table')}
        />
        <p>
          <strong>Hint:</strong> Use the{' '}
          <span className={cx('meta')}>
            <GradientLink text="Dawn-Dash: Cardex" url="https://dawn-dash.com/cardex" />
          </span>{' '}
          to easily find all cards matching these keywords!
        </p>
      </>
    )
  }

  const renderAccuracyScoringBonus = ({ scoring }: WeeklyChallengeData) => {
    const { accuracyBaseValue, allowNegativeAccuracy, target, buffer } = scoring

    const getDerivedRange = (offset: number) =>
      `${target - buffer + 1 + offset * buffer} - ${target + buffer - 1 + offset * buffer}`

    const accuracyTableColumns = [
      { header: 'Cards in deck', accessor: 'cards' as const, className: 'bold' },
      { header: 'Penalty', accessor: 'penalty' as const, className: 'value' },
      { header: 'Base score', accessor: 'score' as const, className: 'highlighted' },
    ]
    const accuracyTableData = [
      {
        cards: getDerivedRange(-3),
        penalty: accuracyBaseValue * 0.3,
        score: accuracyBaseValue * 0.7,
      },
      {
        cards: getDerivedRange(-2),
        penalty: accuracyBaseValue * 0.2,
        score: accuracyBaseValue * 0.8,
      },
      {
        cards: getDerivedRange(-1),
        penalty: accuracyBaseValue * 0.1,
        score: accuracyBaseValue * 0.9,
      },
      {
        cards: (
          <Highlight mode={ScoringMode.Blightbane} strong>
            {getDerivedRange(0)}
          </Highlight>
        ),
        penalty: (
          <Highlight mode={ScoringMode.Blightbane} strong>
            0
          </Highlight>
        ),
        score: accuracyBaseValue,
      },
      {
        cards: getDerivedRange(1),
        penalty: accuracyBaseValue * 0.1,
        score: accuracyBaseValue * 0.9,
      },
      {
        cards: getDerivedRange(2),
        penalty: accuracyBaseValue * 0.2,
        score: accuracyBaseValue * 0.8,
      },
      {
        cards: getDerivedRange(3),
        penalty: accuracyBaseValue * 0.3,
        score: accuracyBaseValue * 0.7,
      },
    ]

    return (
      <>
        <p>
          This bonus will scale with your <strong>malignancy level</strong>! The accuracy
          score-related settings are:
        </p>
        <ScoringList
          mode={ScoringMode.Blightbane}
          items={[
            <>
              <strong>Accuracy base value:</strong>{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {accuracyBaseValue}
              </Highlight>
            </>,
            <>
              <strong>Allow negative accuracy:</strong>{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {allowNegativeAccuracy ? 'Yes' : 'No'}
              </Highlight>
            </>,
            <>
              <strong>Target:</strong>{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {target}
              </Highlight>
            </>,
            <>
              <strong>Buffer:</strong>{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {buffer}
              </Highlight>
            </>,
          ]}
        />
        <ScoringButton
          mode={ScoringMode.Blightbane}
          onClick={() => setIsAccuracySettingsModalOpen(true)}
          className={cx('explain-settings-button')}
        >
          Explain these settings
        </ScoringButton>
        <ScoringTable
          mode={ScoringMode.Blightbane}
          columns={accuracyTableColumns}
          data={accuracyTableData}
          className={cx('accuracy-scoring-table')}
        />
      </>
    )
  }

  const renderAdvancedInsight = ({ scoring }: WeeklyChallengeData) => {
    if (scoring.calculationType !== 'DiminishingReturns') {
      return renderUnsupportedSectionText(scoring.calculationType)
    }

    const { accuracyBaseValue, target, buffer, cardBaseValue, diminishingReturnsLimit } = scoring
    const breakTarget = accuracyBaseValue * 0.1

    const justAbove = findCombinationJustAbove(
      breakTarget,
      cardBaseValue,
      buffer,
      diminishingReturnsLimit
    )

    return (
      <>
        <p>
          To come out ahead after breaking the <strong>accuracy window</strong>, you must collect at
          least{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {breakTarget}
          </Highlight>{' '}
          (scalable) points, for every time you pass the <strong>buffer</strong> (
          <Highlight mode={ScoringMode.Blightbane} strong>
            {buffer}
          </Highlight>{' '}
          cards) beyond the target count of{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {target}
          </Highlight>
          .
        </p>
        <p>
          A combination of{' '}
          {justAbove && (
            <>
              <Code>
                <strong>{justAbove.combination.description}</strong>
              </Code>{' '}
              <strong>keyword-matching</strong> cards gives you{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {justAbove.totalScore}
              </Highlight>{' '}
              (<Code>{justAbove.combination.calculation}</Code>
              ). Aim for similar or stronger combinations of{' '}
              <Highlight mode={ScoringMode.Blightbane} strong>
                {buffer}
              </Highlight>{' '}
              scoring cards, to guarantee a <strong>net positive score</strong> each time you pass
              the <strong>buffer</strong>.
            </>
          )}
        </p>
      </>
    )
  }

  return (
    <CollapsiblePanel
      title={"Bolgar's Blueprints"}
      imageUrl={BolgarCreatureImageUrl}
      mode={ScoringMode.Blightbane}
      collapsible
      defaultExpanded
      isLongTitle
    >
      <div className={cx('content')}>
        <p>
          This is an auto-generated <strong>score guide</strong>, specifically tailored for the
          ongoing <Highlight mode={ScoringMode.WeeklyChallenge}>Weekly Challenge</Highlight>.
        </p>
        <p className={cx('warning')}>⚠️ Still a bit experimental. Use with caution!</p>

        {isLoading && (
          <div className={cx('loading')}>
            <LoadingDots text="Loading Weekly Challenge" dotsClassName={cx('loading-dots')} />
          </div>
        )}
        {isError && (
          <div className={cx('error')}>
            <span className={cx('error__emoji')}>💀</span>
            <span className={cx('error__text')}>
              Failed to load the current <strong>Weekly Challenge</strong>
              <span className={cx('error__text')}>. Refresh the page, or try again later.</span>
            </span>
          </div>
        )}
        {!isLoading && !isError && challengeData && (
          <>
            <hr className={cx('divider')} />
            <div className={cx('intro-container')}>
              <div className={cx('intro-container__name')}>⚔️ &nbsp;{challengeData.name}</div>
              <div className={cx('intro-container__intro')}>{challengeData.intro}</div>
            </div>
            <div className={cx('meta-container')}>
              <div className={cx('meta')}>
                <span className={cx('meta__emoji')}>📆</span>
                {formatDate(challengeData.from)} - {formatDate(challengeData.to)}
              </div>
              <div className={cx('meta')}>
                <span className={cx('meta__emoji')}>🦠</span>
                <GradientLink
                  text="Challenge page"
                  url={`https://blightbane.io/challenge/${challengeData.uid}`}
                />
              </div>
            </div>

            <h3 className={cx('header')}>🎖️ Fixed score bonuses</h3>
            <p>
              These bonuses will <strong>not</strong> scale with your{' '}
              <strong>malignancy level</strong>. They are added to the total score as-is.
            </p>
            <ParameterInfoList
              parameters={getFixedValueScoringParameters(challengeData)}
              className={cx('fixed-value-scoring')}
              mode={ScoringMode.Blightbane}
              fluidLabels
              bordered
            />

            <h3 className={cx('header')}>📝 Keywords bonuses</h3>

            {renderKeywordsScoringBonus(challengeData)}

            <h3 className={cx('header')}>🎯 Accuracy bonus</h3>

            {renderAccuracyScoringBonus(challengeData)}

            <h3 className={cx('header')}>🧠 Advanced insight</h3>

            {renderAdvancedInsight(challengeData)}
          </>
        )}
      </div>

      <InfoModal
        isOpen={isKeywordsSettingsModalOpen}
        onClose={() => setIsKeywordsSettingsModalOpen(false)}
      >
        <h3>Keywords bonuses settings</h3>
        <p>
          <div className={cx('explain-settings-item-header')}>
            Base value:{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {currentScoreParams.cardBaseValue}
            </Highlight>
          </div>
          A <strong>Common</strong> card matching the weekly keywords is worth{' '}
          <Highlight mode={ScoringMode.Blightbane}>{currentScoreParams.cardBaseValue}</Highlight>{' '}
          base points. Each rarity level above common is worth <strong>50%</strong> more than the
          previous one.
        </p>
        <hr className={cx('divider')} />
        <p>
          <div className={cx('explain-settings-item-header')}>
            Diminishing returns limit:{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {currentScoreParams.diminishingReturnsLimit}
            </Highlight>
          </div>
          Only your first{' '}
          <Highlight mode={ScoringMode.Blightbane}>
            {currentScoreParams.diminishingReturnsLimit}
          </Highlight>{' '}
          copies of each matching card are scored, with each additional copy being scored{' '}
          <strong>half</strong> as much as the previous copy.
          <br />
          All other copies beyond that are <strong>not</strong> scored.
        </p>
      </InfoModal>

      <InfoModal
        isOpen={isAccuracySettingsModalOpen}
        onClose={() => setIsAccuracySettingsModalOpen(false)}
      >
        <h3>Accuracy bonus settings</h3>
        <p>
          <div className={cx('explain-settings-item-header')}>
            Base value:{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {currentScoreParams.accuracyBaseValue}
            </Highlight>
          </div>
          You start with a{' '}
          <Highlight mode={ScoringMode.Blightbane}>
            {currentScoreParams.accuracyBaseValue}
          </Highlight>{' '}
          base accuracy score, which you will keep if you finish the challenge within the{' '}
          <strong>accuracy window</strong>.
        </p>
        <hr className={cx('divider')} />
        <p>
          <div className={cx('explain-settings-item-header')}>
            Target:{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {currentScoreParams.target}
            </Highlight>
          </div>
          <div className={cx('explain-settings-item-header')}>
            Buffer:{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {currentScoreParams.buffer}
            </Highlight>
          </div>
          You are penalized by <strong>10%</strong> (
          <Highlight mode={ScoringMode.Blightbane}>
            {currentScoreParams.accuracyBaseValue * 0.1}
          </Highlight>
          ) points for every{' '}
          <Highlight mode={ScoringMode.Blightbane}>{currentScoreParams.buffer}</Highlight> cards you
          are away from the target (
          <Highlight mode={ScoringMode.Blightbane}>{currentScoreParams.target}</Highlight>). Either
          above or below the target.
          <br />
          Passing the buffer once will put outside the <strong>
            derived accuracy window:
          </strong> [{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {currentScoreParams.target - currentScoreParams.buffer + 1} -{' '}
            {currentScoreParams.target + currentScoreParams.buffer - 1}
          </Highlight>{' '}
          ].
        </p>
        <hr className={cx('divider')} />
        <p>
          <div className={cx('explain-settings-item-header')}>
            Allow negative accuracy:{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {currentScoreParams.allowNegativeAccuracy ? 'Yes' : 'No'}
            </Highlight>
          </div>
          If enabled, you can get a negative accuracy score by passing the <strong>buffer</strong>{' '}
          more than ten times.
        </p>
      </InfoModal>
    </CollapsiblePanel>
  )
}

export default BolgarsBlueprintsPanel
