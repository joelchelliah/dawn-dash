import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

/**
 * What each pill costs on top of its text, expressed in characters.
 */
const PILL_OVERHEAD_IN_CHARACTERS = 3

interface KeywordPillsProps {
  parsedKeywords: string[]
  matches: string[]
  setKeywords?: (keywords: string) => void // Omit to render read-only pills
  reserveSpaceWhenEmpty?: boolean
  singleLine?: boolean
  /**
   * Roughly how much horizontal room the pills may take, counted in characters.
   */
  maxPillCharacters?: number
}

/** Keywords that fit the character budget, always as a prefix of the full list. */
const withinCharacterBudget = (keywords: string[], budget: number): string[] => {
  const visible: string[] = []
  let used = 0

  for (const keyword of keywords) {
    const cost = keyword.length + PILL_OVERHEAD_IN_CHARACTERS
    // Always show at least one, however long — an empty row says less than a clipped pill.
    if (visible.length > 0 && used + cost > budget) break
    visible.push(keyword)
    used += cost
  }

  return visible
}

const KeywordPills = ({
  parsedKeywords,
  matches,
  setKeywords,
  reserveSpaceWhenEmpty = false,
  singleLine = false,
  maxPillCharacters,
}: KeywordPillsProps) => {
  if (parsedKeywords.length === 0) {
    return reserveSpaceWhenEmpty ? <div className={cx('pills', 'pills--empty')} /> : null
  }

  const lowercasedMatches = new Set(matches.map((match) => match.toLowerCase()))
  const visibleKeywords = maxPillCharacters
    ? withinCharacterBudget(parsedKeywords, maxPillCharacters)
    : parsedKeywords

  const removeKeyword = (indexToRemove: number) => {
    setKeywords?.(parsedKeywords.filter((_, index) => index !== indexToRemove).join(', '))
  }

  return (
    <div className={cx('pills', { 'pills--single-line': singleLine })}>
      {visibleKeywords.map((keyword, index) => (
        <span
          key={`${keyword}-${index}`}
          className={cx('pill', {
            'pill--full-match': lowercasedMatches.has(keyword.toLowerCase()),
            'pill--readonly': !setKeywords,
          })}
        >
          <span className={cx('pill__label')}>{keyword}</span>
          {setKeywords && (
            <button
              type="button"
              className={cx('pill__remove')}
              onClick={() => removeKeyword(index)}
              aria-label={`Remove keyword ${keyword}`}
            />
          )}
        </span>
      ))}
    </div>
  )
}

export default KeywordPills
