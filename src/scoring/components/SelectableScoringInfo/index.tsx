import { ReactNode } from 'react'

import ScrollableWithFade from '@/shared/components/ScrollableWithFade'
import Select from '@/shared/components/Select'
import { createCx } from '@/shared/utils/classnames'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'
import { CharacterClass } from '@/shared/types/characterClass'

import { ScoringMode } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

export interface SelectableItem<T extends string = string> {
  value: T
  label: string
  emoji?: string
}

interface SelectableScoringInfoProps<T extends string = string> {
  mode: ScoringMode
  selectedClass: CharacterClass
  items: SelectableItem<T>[]
  selectedValue: T
  onSelectChange: (value: T) => void
  selectLabel: string
  renderContent: () => ReactNode
  renderListItem?: (item: SelectableItem<T>, isActive: boolean) => ReactNode
  // Height of the visible scroll viewport, in px
  containerHeight: number
  // Height of the scroll fade
  fadeHeight?: string
}

function SelectableScoringInfo<T extends string = string>({
  mode,
  selectedClass,
  items,
  selectedValue,
  onSelectChange,
  selectLabel,
  renderContent,
  renderListItem,
  containerHeight,
  fadeHeight,
}: SelectableScoringInfoProps<T>): JSX.Element {
  const { isMobile } = useBreakpoint()

  const defaultRenderListItem = (item: SelectableItem<T>) => (
    <>
      {item.emoji && <span className={cx('item-emoji')}>{item.emoji}</span>}
      <span className={cx('item-label')}>{item.label}</span>
    </>
  )

  return (
    <div className={cx('selectable-container', `selectable-container--${mode}`)}>
      <div
        className={cx('columns')}
        style={
          isMobile
            ? undefined
            : ({ '--container-height': `${containerHeight}px` } as React.CSSProperties)
        }
      >
        {isMobile ? (
          <div className={cx('mobile-select-container')}>
            <Select
              id="selectable-info-select"
              selectedClass={selectedClass}
              label={selectLabel}
              options={items}
              value={selectedValue}
              onChange={(value) => onSelectChange(value as T)}
            />
          </div>
        ) : (
          <div className={cx('left-column')}>
            <ul className={cx('item-list', `item-list--${mode}`)}>
              {items.map((item) => {
                const isActive = selectedValue === item.value
                return (
                  <li
                    key={item.value}
                    className={cx('item', `item--${mode}`, {
                      active: isActive,
                    })}
                    onClick={() => onSelectChange(item.value)}
                  >
                    {renderListItem ? renderListItem(item, isActive) : defaultRenderListItem(item)}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className={cx('right-column')}>
          {isMobile ? (
            <div className={cx('content-area', 'content-area--mobile')}>{renderContent()}</div>
          ) : (
            <ScrollableWithFade
              maxHeight={`${containerHeight}px`}
              fadeColor="rgba(25, 25, 25, 1)"
              fadeHeight={fadeHeight}
              scrollBottomOffset={110}
            >
              <div className={cx('content-area')}>{renderContent()}</div>
            </ScrollableWithFade>
          )}
        </div>
      </div>
    </div>
  )
}

export default SelectableScoringInfo
