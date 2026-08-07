import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface KeywordPillsProps {
  parsedKeywords: string[]
  matches: string[]
  setKeywords?: (keywords: string) => void // Omit to render read-only pills
  reserveSpaceWhenEmpty?: boolean
}

const KeywordPills = ({
  parsedKeywords,
  matches,
  setKeywords,
  reserveSpaceWhenEmpty = false,
}: KeywordPillsProps) => {
  if (parsedKeywords.length === 0) {
    return reserveSpaceWhenEmpty ? <div className={cx('pills', 'pills--empty')} /> : null
  }

  const lowercasedMatches = new Set(matches.map((match) => match.toLowerCase()))

  const removeKeyword = (indexToRemove: number) => {
    setKeywords?.(parsedKeywords.filter((_, index) => index !== indexToRemove).join(', '))
  }

  return (
    <div className={cx('pills')}>
      {parsedKeywords.map((keyword, index) => (
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
