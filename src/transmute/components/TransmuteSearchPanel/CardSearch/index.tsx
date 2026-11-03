import { useMemo, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { CardData } from '@/shared/types/cards'
import SearchField from '@/shared/components/SearchField'
import RarityBorderedArtwork from '@/shared/components/RarityBorderedArtwork'

import { findCardSuggestions, getSearchableCards, getTwinHint } from '@/transmute/utils/cardSearch'

import styles from './index.module.scss'

const cx = createCx(styles)

const INPUT_ID = 'transmute-card-search'
const LISTBOX_ID = 'transmute-card-suggestions'
const ARTWORK_SIZE = 28

const getOptionId = (card: CardData) => `transmute-card-suggestion-${card.blightbane_id}`

interface CardSearchProps {
  cards: CardData[]
  searchText: string
  setSearchText: (text: string) => void
  selectedCard: CardData | null
  selectCard: (card: CardData) => void
}

// The ARIA combobox pattern: focus stays in the input, and `aria-activedescendant` marks the option
const CardSearch = ({
  cards,
  searchText,
  setSearchText,
  selectedCard,
  selectCard,
}: CardSearchProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const searchableCards = useMemo(() => getSearchableCards(cards), [cards])
  const suggestions = useMemo(
    () => findCardSuggestions(searchableCards, searchText),
    [searchableCards, searchText]
  )

  const isExpanded = isOpen && suggestions.length > 0
  const activeCard = isExpanded ? suggestions[activeIndex] : undefined

  const handleTextChange = (text: string) => {
    setSearchText(text)
    setActiveIndex(-1)
    setIsOpen(true)
  }

  const handleSelect = (card: CardData) => {
    selectCard(card)
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault()
        if (!isExpanded) {
          setIsOpen(true)
          return
        }
        const step = e.key === 'ArrowDown' ? 1 : -1
        setActiveIndex((index) => (index + step + suggestions.length) % suggestions.length)
        return
      }
      case 'Enter':
        if (!isExpanded) return
        e.preventDefault()
        // No highlighted option picks the top match, so typing a name and pressing Enter is enough
        handleSelect(activeCard ?? suggestions[0])
        return
      case 'Escape':
        if (!isExpanded) return
        e.preventDefault()
        setIsOpen(false)
        setActiveIndex(-1)
        return
    }
  }

  return (
    <div className={cx('card-search')}>
      <SearchField
        keywords={searchText}
        setKeywords={handleTextChange}
        mode="text"
        id={INPUT_ID}
        ariaLabel="Search for a card"
        placeholder="Search for a card"
        inputProps={{
          role: 'combobox',
          autoComplete: 'off',
          'aria-autocomplete': 'list',
          'aria-expanded': isExpanded,
          'aria-controls': LISTBOX_ID,
          'aria-activedescendant': activeCard ? getOptionId(activeCard) : undefined,
          onKeyDown: handleKeyDown,
          // Reopens on focus unless the text is already the selected card's name
          onFocus: () => setIsOpen(searchText !== selectedCard?.name),
          onBlur: () => setIsOpen(false),
        }}
      >
        {isExpanded && (
          <ul id={LISTBOX_ID} role="listbox" aria-label="Cards" className={cx('suggestions')}>
            {suggestions.map((card, index) => (
              <li
                key={card.blightbane_id}
                id={getOptionId(card)}
                role="option"
                aria-selected={index === activeIndex}
                className={cx('suggestion', { 'suggestion--active': index === activeIndex })}
                // Keeps focus in the input, so the blur doesn't close the list before the click lands
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(card)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <RarityBorderedArtwork
                  cardName={card.name}
                  rarity={card.rarity}
                  category={card.category}
                  size={ARTWORK_SIZE}
                />
                <span className={cx('suggestion__text')}>
                  <span className={cx('suggestion__name')}>{card.name}</span>
                  {card.hasDuplicateName && (
                    <span className={cx('suggestion__hint')}>{getTwinHint(card)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SearchField>
    </div>
  )
}

export default CardSearch
