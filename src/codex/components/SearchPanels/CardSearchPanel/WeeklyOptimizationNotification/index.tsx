import { Fragment, useCallback, useEffect, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import Notification from '@/shared/components/Notification'

import { WeeklyChallengeNotification } from '@/codex/hooks/useSearchFilters/useAllCardSearchFilters'

import styles from './index.module.scss'

const cx = createCx(styles)

const BASE_DURATION = 5000
const EXTRA_DURATION_PER_MESSAGE = 2500

const NOTIFICATION_CONTENT: Record<
  WeeklyChallengeNotification,
  { icon: string; text: React.ReactNode }
> = {
  untrackedCards: {
    icon: '🔍',
    text: (
      <>
        You have <strong>tracked cards</strong> from your last search! Clear them with «
        <strong>Reset tracked cards</strong>».
      </>
    ),
  },
  specialKeywordRules: {
    icon: '📝',
    text: (
      <>
        A <strong>rarity level</strong> is used as a keyword in this challenge! All cards of this{' '}
        <strong>rarity</strong> will be scored.
      </>
    ),
  },
  negativeKeywords: {
    icon: '🧼',
    text: (
      <>
        Keywords with a <strong>negative</strong> score have been filtered out by the optimization!
      </>
    ),
  },
}

interface WeeklyOptimizationNotificationProps {
  notifications: WeeklyChallengeNotification[]
  onShown: () => void
}

const WeeklyOptimizationNotification = ({
  notifications,
  onShown,
}: WeeklyOptimizationNotificationProps) => {
  const [shownNotifications, setShownNotifications] = useState<WeeklyChallengeNotification[]>([])

  useEffect(() => {
    if (notifications.length === 0) return

    setShownNotifications(notifications)
    onShown()
  }, [notifications, onShown])

  // Memoized because `Notification` restarts its hide timer whenever `onClose` changes
  const handleClose = useCallback(() => setShownNotifications([]), [])

  const duration =
    BASE_DURATION + EXTRA_DURATION_PER_MESSAGE * Math.max(0, shownNotifications.length - 1)

  return (
    <Notification
      duration={duration}
      isTriggered={shownNotifications.length > 0}
      onClose={handleClose}
      message={
        <div className={cx('notification-message')}>
          <strong className={cx('notification-message__title')}>Optimized for Weekly!</strong>
          <div className={cx('notification-message__divider')} />
          {shownNotifications.map((notification) => {
            const { icon, text } = NOTIFICATION_CONTENT[notification]
            return (
              <Fragment key={notification}>
                <div className={cx('notification-message__icon')}>{icon}</div>
                <div className={cx('notification-message__text')}>{text}</div>
              </Fragment>
            )
          })}
        </div>
      }
      alignCloseButtonTop
    />
  )
}

export default WeeklyOptimizationNotification
