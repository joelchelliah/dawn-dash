import { useEffect, useState } from 'react'

import { CharacterClass } from '@/shared/types/characterClass'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface SearchFieldProps {
  keywords: string
  setKeywords: (keywords: string) => void
  mode?: 'keywords' | 'text'
  label?: string
  placeholder?: string
  selectedClass?: CharacterClass
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

const SearchField = ({
  keywords,
  setKeywords,
  mode = 'keywords',
  label,
  placeholder,
  selectedClass,
}: SearchFieldProps) => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => setIsClient(true), [])

  if (!isClient) return <></>

  const { labelStyle, inputStyle, clearButtonStyle } = getStylesByMode(mode, selectedClass)

  return (
    <>
      {label && (
        <label className={cx('input-label')} htmlFor="search-field" style={labelStyle}>
          {label}
        </label>
      )}
      <div className={cx('input-container')}>
        <input
          id="search-field"
          type="text"
          placeholder={placeholder || 'Keywords, separated, by, comma'}
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

export default SearchField
