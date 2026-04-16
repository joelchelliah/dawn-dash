import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import { ScoringMode } from '@/scoring/types'
import ScoringButton from '@/scoring/components/ScoringButton'

import styles from './index.module.scss'

const cx = createCx(styles)

interface BasePanelProps {
  title?: React.ReactNode
  titleShort?: React.ReactNode
  children: React.ReactNode
  imageUrl?: string
  mode?: ScoringMode
  isLongTitle?: boolean
  onNext?: () => void // Handler for next button
  onPrevious?: () => void // Handler for previous button
  isFirstPanel?: boolean // Whether this is the first panel in sequence
  isLastPanel?: boolean // Whether this is the last panel in sequence
  panelId?: string // Unique identifier for scrolling
}

function BasePanel({
  title,
  titleShort,
  children,
  imageUrl,
  mode,
  isLongTitle = false,
  onNext,
  onPrevious,
  isFirstPanel = false,
  isLastPanel = false,
  panelId,
}: BasePanelProps): JSX.Element {
  const { isMobile } = useBreakpoint()

  const titleToDisplay = isMobile && titleShort ? titleShort : title

  return (
    <div className={cx('panel')} data-panel-id={panelId}>
      {titleToDisplay && (
        <div
          className={cx('panel-header', {
            'panel-header--expanded': mode,
            [`panel-header--${mode}`]: mode,
          })}
        >
          <div className={cx('panel-header__title-container')}>
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
          {mode && (onNext || onPrevious) && (
            <div className={cx('panel-header__navigation')}>
              {!isFirstPanel && onPrevious && (
                <ScoringButton
                  onClick={onPrevious}
                  mode={mode}
                  className={cx('panel-header__navigation-button')}
                >
                  {isMobile ? '«' : 'Previous'}
                </ScoringButton>
              )}
              {!isLastPanel && onNext && (
                <ScoringButton
                  onClick={onNext}
                  mode={mode}
                  className={cx('panel-header__navigation-button')}
                >
                  {isMobile ? '»' : 'Next'}
                </ScoringButton>
              )}
            </div>
          )}
        </div>
      )}
      <div className={cx('panel-content')}>{children}</div>
    </div>
  )
}

export default BasePanel
