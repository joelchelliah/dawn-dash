import { useEffect, useState } from 'react'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import { ScoringMode } from '@/scoring/types'
import ScoringButton from '@/scoring/components/ScoringButton'

import styles from './index.module.scss'

const cx = createCx(styles)

interface CollapsiblePanelProps {
  title?: React.ReactNode
  titleShort?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
  imageUrl?: string
  mode?: ScoringMode
  isLongTitle?: boolean
}

function CollapsiblePanel({
  title,
  titleShort,
  children,
  collapsible = false,
  defaultExpanded = false,
  imageUrl,
  mode,
  isLongTitle = false,
}: CollapsiblePanelProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || !collapsible)
  const { isMobile } = useBreakpoint()

  const titleToDisplay = isMobile && titleShort ? titleShort : title

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
      {titleToDisplay && (
        <div
          className={cx('panel-header', {
            'panel-header--expanded': isExpanded && mode,
            [`panel-header--${mode}`]: isExpanded && mode,
          })}
        >
          <div
            className={cx('panel-header__title-container', {
              'panel-header__title-container--clickable': collapsible,
            })}
            onClick={toggleExpanded}
          >
            {imageUrl && (
              <div className={cx('panel-header__image', mode && `panel-header__image--${mode}`)}>
                <Image src={imageUrl} alt={title as string} width={40} height={40} />
              </div>
            )}
            <h2
              className={cx('panel-header__title', `panel-header__title--${mode}`, {
                'panel-header__title--long': isLongTitle,
              })}
            >
              {titleToDisplay}
            </h2>
          </div>
          {collapsible && mode && (
            <ScoringButton onClick={toggleExpanded} mode={mode}>
              {isExpanded ? 'Hide' : 'Show'}
            </ScoringButton>
          )}
        </div>
      )}
      {isExpanded && <div className={cx('panel-content')}>{children}</div>}
    </div>
  )
}

export default CollapsiblePanel
