import { format } from 'date-fns'

import { BolgarCreatureImageUrl } from '@/shared/utils/imageUrls'
import { createCx } from '@/shared/utils/classnames'
import LoadingDots from '@/shared/components/LoadingDots'
import GradientLink from '@/shared/components/GradientLink'
import Image from '@/shared/components/Image'

import { FixedValueAction, ScoringMode, WeeklyChallengeData } from '@/scoring/types'
import { useWeeklyChallengeData } from '@/scoring/hooks/useWeeklyChallengeData'
import { useCardImageSrc } from '@/scoring/hooks/useCardImageSrc'

import Highlight from '../Highlight'
import BasePanel from '../BasePanel'
import ParameterInfoList from '../ParameterInfoList'

import KeywordsBonusScoring from './KeywordsBonusScoring'
import AccuracyBonusScoring from './AccuracyBonusScoring'
import AdvancedInsight from './AdvancedInsight'
import styles from './index.module.scss'

const cx = createCx(styles)

const formatDate = (date: string) => format(new Date(date), 'MMM dd')

interface FixedValueConfig {
  emoji: string
  getDescription: (keyword: string, pointLimit: number) => React.ReactNode
}

const FIXED_VALUE_CONFIG: Record<FixedValueAction, FixedValueConfig> = {
  DeckContainsCard: {
    emoji: '🃏',
    getDescription: (keyword) => (
      <>
        For having a <GradientLink text={keyword} url={`https://blightbane.io/card/${keyword}`} />{' '}
        in your deck.
      </>
    ),
  },
  PointsPerCard: {
    emoji: '🗂️',
    getDescription: (keyword, pointLimit) => {
      const pointLimitPostfix =
        pointLimit > 1 ? (
          <span className={cx('fixed-value-scoring-point-limit-postfix')}>
            {' '}
            (up to max <Highlight mode={ScoringMode.Blightbane}>{pointLimit}</Highlight> points)
          </span>
        ) : (
          ''
        )
      return (
        <>
          For each copy of{' '}
          <GradientLink text={keyword} url={`https://blightbane.io/card/${keyword}`} /> in your deck
          {pointLimitPostfix}.
        </>
      )
    },
  },
  PointsPerUpgrade: {
    emoji: '🛠️',
    getDescription: (keyword) => (
      <>
        For each upgrade on <strong>{keyword}</strong> in your deck.
      </>
    ),
  },
  DefeatSpecificBoss: {
    emoji: '👺',
    getDescription: (keyword) => (
      <>
        For defeating{' '}
        <GradientLink text={keyword} url={`https://blightbane.io/monster/${keyword}`} />.
      </>
    ),
  },
  UseSpecificMalignancy: {
    emoji: '🦠',
    getDescription: (keyword) => (
      <>
        For using the <strong>{keyword}</strong> malignancy.
      </>
    ),
  },
  Victory: {
    emoji: '🏆',
    getDescription: () => (
      <>
        For completing <strong>the final encounter</strong>.
      </>
    ),
  },
}

const getFixedValueScoringParameters = ({ scoring }: WeeklyChallengeData) =>
  scoring.fixedValueScoring.map((item) => {
    const config = FIXED_VALUE_CONFIG[item.action as FixedValueAction]

    return {
      emoji: config?.emoji || '❗',
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
          {config?.getDescription(item.keyword, item.pointLimit) ||
            `${item.action} (${item.keyword})`}
        </span>
      ),
    }
  })

interface BolgarsBlueprintsPanelProps {
  weeklyChallengeData: ReturnType<typeof useWeeklyChallengeData>
  onNext?: () => void
  onPrevious?: () => void
  isFirstPanel?: boolean
  isLastPanel?: boolean
  panelId?: string
}

function BolgarsBlueprintsPanel({
  weeklyChallengeData,
  onNext,
  onPrevious,
  isFirstPanel,
  isLastPanel,
  panelId,
}: BolgarsBlueprintsPanelProps): JSX.Element {
  const { challengeData, isLoading, isError } = weeklyChallengeData
  const { cardImageSrc, onImageSrcError } = useCardImageSrc(challengeData?.image || '')

  return (
    <BasePanel
      title={"Bolgar's Blueprints"}
      imageUrl={BolgarCreatureImageUrl}
      mode={ScoringMode.Blightbane}
      isLongTitle
      onNext={onNext}
      onPrevious={onPrevious}
      isFirstPanel={isFirstPanel}
      isLastPanel={isLastPanel}
      panelId={panelId}
    >
      <div className={cx('content')}>
        <p>
          An auto-generated <strong>score guide</strong>, specifically targeting the current{' '}
          <Highlight mode={ScoringMode.WeeklyChallenge}>Weekly Challenge</Highlight>. Requires a{' '}
          basic understanding of the <Highlight mode={ScoringMode.Blightbane}>Blightbane</Highlight>{' '}
          scoring system.
        </p>

        <hr className={cx('divider')} />

        {isLoading && (
          <div className={cx('loading')}>
            <LoadingDots
              text="Loading Weekly Challenge"
              className={cx('loading-dots-container')}
              dotsClassName={cx('loading-dots')}
            />
          </div>
        )}
        {!isLoading && isError && (
          <div className={cx('error')}>
            <span className={cx('error__emoji')}>💀</span>
            <span className={cx('error__text')}>
              Failed to load the current <strong>Weekly Challenge</strong>
              <span className={cx('error__text')}>
                .{' '}
                <GradientLink
                  text="Refresh"
                  onClick={() => window.location.reload()}
                  className={cx('error__link')}
                />{' '}
                the page, or try again later.
              </span>
            </span>
          </div>
        )}
        {!isLoading && !isError && challengeData && (
          <>
            <div className={cx('intro-container')}>
              <div className={cx('intro-container__name')}>
                {cardImageSrc && (
                  <Image
                    src={cardImageSrc}
                    alt={`${challengeData.image} image`}
                    height={36}
                    width={36}
                    className={cx('intro-container__icon')}
                    onError={onImageSrcError}
                  />
                )}
                {challengeData.name}
              </div>
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
              These bonuses do <strong>not</strong> scale with your{' '}
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
    </BasePanel>
  )
}

export default BolgarsBlueprintsPanel
