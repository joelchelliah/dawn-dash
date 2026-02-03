import { useCallback, useEffect, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

const VISIBLE_DURATION = 3500
const ANIMATION_DURATION = 300

interface NotificationProps {
  message: React.ReactNode
  isTriggered: boolean
  onClose: () => void
  duration?: number
}

function Notification({
  message,
  isTriggered,
  onClose,
  duration = VISIBLE_DURATION,
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const hideNotification = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, ANIMATION_DURATION)
  }, [onClose])

  useEffect(() => {
    if (!isTriggered) return

    setIsVisible(true)
    setIsExiting(false)

    const hideTimer = setTimeout(hideNotification, duration)

    return () => clearTimeout(hideTimer)
  }, [isTriggered, hideNotification, duration])

  if (!isVisible) return null

  return (
    <div
      className={cx('notification', { 'notification--exiting': isExiting })}
      style={{ '--notification-duration': `${duration}ms` } as React.CSSProperties}
    >
      <div className={cx('content')}>
        <span className={cx('message')}>{message}</span>
        <button
          className={cx('close-button')}
          onClick={hideNotification}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
      <div className={cx('progress-bar')} />
    </div>
  )
}

export default Notification
