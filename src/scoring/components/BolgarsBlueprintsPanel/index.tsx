import { format } from 'date-fns'

import { BolgarCreatureImageUrl } from '@/shared/utils/imageUrls'
import { createCx } from '@/shared/utils/classnames'
import LoadingDots from '@/shared/components/LoadingDots'
import GradientLink from '@/shared/components/GradientLink'

import { ScoringMode, WeeklyChallengeData } from '@/scoring/types'
import { useWeeklyChallengeData } from '@/scoring/hooks/useWeeklyChallengeData'

import Highlight from '../Highlight'
import CollapsiblePanel from '../CollapsiblePanel'
import ParameterInfoList from '../ParameterInfoList'

import KeywordsBonusScoring from './KeywordsBonusScoring'
import AccuracyBonusScoring from './AccuracyBonusScoring'
import AdvancedInsight from './AdvancedInsight'
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

  return (
    <CollapsiblePanel
      title={"Bolgar's Blueprints"}
      imageUrl={BolgarCreatureImageUrl}
      mode={ScoringMode.Blightbane}
      collapsible
      isLongTitle
    >
      <div className={cx('content')}>
        <p>
          This is an auto-generated <strong>score guide</strong>, specifically tailored for the
          ongoing <Highlight mode={ScoringMode.WeeklyChallenge}>Weekly Challenge</Highlight>. You
          must understand the basics of the{' '}
          <Highlight mode={ScoringMode.Blightbane}>Blightbane scoring</Highlight> to make the most
          of this tool.
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
              <strong>malignancy level</strong>.
            </p>
            <ParameterInfoList
              parameters={getFixedValueScoringParameters(challengeData)}
              className={cx('fixed-value-scoring')}
              mode={ScoringMode.Blightbane}
              fluidLabels
              bordered
            />

            <h3 className={cx('header')}>📝 Keywords bonuses</h3>

            <KeywordsBonusScoring challengeData={challengeData} />

            <h3 className={cx('header')}>🎯 Accuracy bonus</h3>

            <AccuracyBonusScoring challengeData={challengeData} />

            <h3 className={cx('header')}>🧠 Advanced insight</h3>

            <AdvancedInsight challengeData={challengeData} />
          </>
        )}
      </div>
    </CollapsiblePanel>
  )
}

export default BolgarsBlueprintsPanel
