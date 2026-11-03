import { useEffect, useState } from 'react'

import { CharacterClass } from '@/shared/types/characterClass'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { createCx } from '@/shared/utils/classnames'

import KeywordPills from '../KeywordPills'

import styles from './index.module.scss'

const cx = createCx(styles)

interface SearchFieldProps {
  keywords: string
  setKeywords: (keywords: string) => void
  mode?: 'keywords' | 'text'
  label?: string
  placeholder?: string
  selectedClass?: CharacterClass
  parsedKeywords?: string[]
  matches?: string[]
  id?: string
  ariaLabel?: string
  // For a combobox: ARIA attributes and key handlers on the input, and its popup as `children`
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  children?: React.ReactNode
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
  parsedKeywords,
  matches,
  id = 'search-field',
  ariaLabel = 'Search keywords',
  inputProps,
  children,
}: SearchFieldProps) => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => setIsClient(true), [])

  if (!isClient) return <></>

  const { labelStyle, inputStyle, clearButtonStyle } = getStylesByMode(mode, selectedClass)

  return (
    <>
      {label && (
        <label className={cx('input-label')} htmlFor={id} style={labelStyle}>
          {label}
        </label>
      )}
      <div className={cx('input-container')}>
        <input
          {...inputProps}
          id={id}
          type="text"
          placeholder={placeholder || 'Keywords, separated, by, comma'}
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          aria-label={ariaLabel}
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
        {children}
      </div>

      {parsedKeywords && (
        <KeywordPills
          parsedKeywords={parsedKeywords}
          matches={matches ?? []}
          setKeywords={setKeywords}
          reserveSpaceWhenEmpty
        />
      )}
    </>
  )
}

export default SearchField
