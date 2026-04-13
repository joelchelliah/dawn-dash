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
  isExpanded?: boolean // Controlled state
  onShow?: () => void // Handler to show/expand this panel
  onNext?: () => void // Handler for next button
  isLastPanel?: boolean // Whether this is the last panel in sequence
  panelId?: string // Unique identifier for scrolling
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
  isExpanded: controlledIsExpanded,
  onShow,
  onNext,
  isLastPanel = false,
  panelId,
}: CollapsiblePanelProps): JSX.Element {
  const [internalIsExpanded, setInternalIsExpanded] = useState(defaultExpanded || !collapsible)
  const { isMobile } = useBreakpoint()

  // Use controlled state if provided, otherwise use internal state
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalIsExpanded

  const titleToDisplay = isMobile && titleShort ? titleShort : title

  const toggleExpanded = () => {
    if (collapsible) {
      if (onShow) {
        onShow()
      } else {
        setInternalIsExpanded(!internalIsExpanded)
      }
    }
  }

  useEffect(() => {
    if (controlledIsExpanded === undefined) {
      setInternalIsExpanded(defaultExpanded || !collapsible)
    }
  }, [defaultExpanded, collapsible, controlledIsExpanded])

  return (
    <div className={cx('panel')} data-panel-id={panelId}>
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
          {collapsible && mode && isExpanded && onNext && !isLastPanel && (
            <ScoringButton onClick={onNext} mode={mode}>
              Next
            </ScoringButton>
          )}
          {collapsible && mode && !isExpanded && (
            <ScoringButton onClick={toggleExpanded} mode={mode}>
              Show
            </ScoringButton>
          )}
        </div>
      )}
      {isExpanded && <div className={cx('panel-content')}>{children}</div>}
    </div>
  )
}

export default CollapsiblePanel
