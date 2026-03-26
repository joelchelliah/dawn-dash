import LoadingDots from '@/shared/components/LoadingDots'
import { createCx } from '@/shared/utils/classnames'

import { ChallengeData } from '@/codex/types/challenges'

import styles from './index.module.scss'

const cx = createCx(styles)

interface WeeklyPanelProps {
  challengeData: ChallengeData | null
  isLoading: boolean
  isError: boolean
}

function WeeklyPanel({ challengeData, isLoading, isError }: WeeklyPanelProps): JSX.Element {
  if (isLoading) {
    return (
      <div className={cx('panel', 'panel--loading')}>
        <div className={cx('loading-content')}>
          <h2>Loading weekly challenge data</h2>
          <LoadingDots color="#ffffff" />
        </div>
      </div>
    )
  }

  if (isError || !challengeData) {
    return (
      <div className={cx('panel', 'panel--error')}>
        <div className={cx('error-content')}>
          <h2>Error loading challenge data</h2>
          <p>Unable to fetch the latest weekly challenge. Please try again later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cx('panel')}>
      <div className={cx('panel-header')}>
        <h2 className={cx('challenge-name')}>{challengeData.name}</h2>
        <p className={cx('challenge-id')}>Challenge #{challengeData.id}</p>
      </div>

      <div className={cx('panel-content')}>
        <section className={cx('section')}>
          <h3 className={cx('section-title')}>Scoring Keywords</h3>
          <div className={cx('keyword-list')}>
            {Array.from(challengeData.keywords).map((keyword) => (
              <span key={keyword} className={cx('keyword-badge')}>
                {keyword}
              </span>
            ))}
          </div>
        </section>

        {challengeData.specialKeywords.size > 0 && (
          <section className={cx('section')}>
            <h3 className={cx('section-title')}>Special Keywords</h3>
            <div className={cx('keyword-list')}>
              {Array.from(challengeData.specialKeywords).map((keyword) => (
                <span key={keyword} className={cx('keyword-badge', 'keyword-badge--special')}>
                  {keyword}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className={cx('section')}>
          <h3 className={cx('section-title')}>Available Banners</h3>
          <div className={cx('banner-list')}>
            {Array.from(challengeData.banners).map((banner) => (
              <span key={banner} className={cx('banner-badge')}>
                {banner}
              </span>
            ))}
          </div>
        </section>

        <section className={cx('section')}>
          <h3 className={cx('section-title')}>Card Sets</h3>
          <div className={cx('cardset-list')}>
            {Array.from(challengeData.cardSets).map((cardSet) => (
              <span key={cardSet} className={cx('cardset-badge')}>
                {cardSet}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default WeeklyPanel
