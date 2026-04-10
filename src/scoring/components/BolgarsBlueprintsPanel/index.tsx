import { format } from 'date-fns'

import { BolgarCreatureImageUrl } from '@/shared/utils/imageUrls'
import { createCx } from '@/shared/utils/classnames'
import LoadingDots from '@/shared/components/LoadingDots'

import { ScoringMode, WeeklyChallengeData } from '@/scoring/types'
import { useWeeklyChallengeData } from '@/scoring/hooks/useWeeklyChallengeData'

import CollapsiblePanel from '../CollapsiblePanel'
import Highlight from '../Highlight'

import styles from './index.module.scss'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'
import GradientLink from '@/shared/components/GradientLink'

const cx = createCx(styles)

const INTRO_MAX_LENGTH = 500
const INTRO_MAX_LENGTH_MOBILE = 5200

const formatDate = (date: string) => format(new Date(date), 'MMM d, yyyy')

function BolgarsBlueprintsPanel(): JSX.Element {
  const { challengeData, isLoading, isError } = useWeeklyChallengeData()

  console.log(challengeData)

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
          This is an auto-generated score guide, specifically tailored for the ongoing{' '}
          <Highlight mode={ScoringMode.WeeklyChallenge}>Weekly Challenge</Highlight>. It explains
          the <Highlight mode={ScoringMode.Blightbane}>Blightbane</Highlight>{' '}
          <strong>bonus objectives</strong> and how they&apos;re scored, along with some tips on
          maximizing some of these bonuses.
        </p>

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
          </>
        )}
      </div>
    </CollapsiblePanel>
  )
}

export default BolgarsBlueprintsPanel
