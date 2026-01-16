import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react'

import { CharacterClass } from '@/shared/types/characterClass'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface SearchFieldProps {
  keywords: string
  setKeywords: (keywords: string) => void
  mode?: 'keywords' | 'text'
  selectedClass?: CharacterClass
}

export interface SearchFieldRef {
  focus: () => void
}

function getStylesByMode(mode: 'keywords' | 'text', selectedClass?: CharacterClass) {
  if (!selectedClass) return { labelStyle: {}, inputStyle: {}, clearButtonStyle: {} }

  const labelColor = getClassColor(selectedClass, ClassColorVariant.Default)
  const inputColor = getClassColor(selectedClass, ClassColorVariant.ControlText)
  const inputBorderColor = getClassColor(selectedClass, ClassColorVariant.Dark)

  const labelPlacementStyle = mode === 'text' ? { display: 'flex', justifySelf: 'center' } : {}

  return {
    labelStyle: { color: labelColor, ...labelPlacementStyle },
    inputStyle: { borderColor: inputBorderColor, color: inputColor },
    clearButtonStyle: { color: inputColor },
  }
}

const SearchField = forwardRef<SearchFieldRef, SearchFieldProps>(
  ({ keywords, setKeywords, mode = 'keywords', selectedClass }, ref) => {
    const [isClient, setIsClient] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => setIsClient(true), [])

    // Expose focus method via ref (always available, even when not rendered)
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          inputRef.current?.focus()
        },
      }),
      []
    )

    if (!isClient) return <></>

    const { labelStyle, inputStyle, clearButtonStyle } = getStylesByMode(mode, selectedClass)
    const placeholder =
      mode === 'keywords' ? 'Keywords, separated, by, comma' : 'Text occurring in the event'

    return (
      <>
        {mode === 'text' && (
          <label className={cx('input-label')} htmlFor="search-field" style={labelStyle}>
            Filter event selection by text
          </label>
        )}
        <div className={cx('input-container')}>
          <input
            ref={inputRef}
            id="search-field"
            type="text"
            placeholder={placeholder}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            aria-label="Search keywords"
            style={inputStyle}
          />
          {keywords && (
            <button
              className={styles['clear-button']}
              onClick={() => setKeywords('')}
              aria-label="Clear search"
              style={clearButtonStyle}
            />
          )}
        </div>
      </>
    )
  }
)

SearchField.displayName = 'SearchField'

export default SearchField
