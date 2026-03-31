import { useEffect, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import GradientButton from '@/shared/components/Buttons/GradientButton'

import styles from './index.module.scss'

const cx = createCx(styles)

interface CollapsiblePanelProps {
  title?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
}

function CollapsiblePanel({
  title,
  children,
  collapsible = false,
  defaultExpanded = false,
}: CollapsiblePanelProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || !collapsible)

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded)
    }
  }

  useEffect(() => {
    setIsExpanded(defaultExpanded || !collapsible)
  }, [defaultExpanded, collapsible])

  return (
    <div className={cx('panel')}>
      {title && (
        <div className={cx('panel-header')}>
          <h2 className={cx('panel-header__title')}>{title}</h2>
          {collapsible && (
            <GradientButton onClick={toggleExpanded} subtle className={cx('toggle-button')}>
              {isExpanded ? 'Hide' : 'Show'}
            </GradientButton>
          )}
        </div>
      )}
      {isExpanded && <div className={cx('panel-content')}>{children}</div>}
    </div>
  )
}

export default CollapsiblePanel
