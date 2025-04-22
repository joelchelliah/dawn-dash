import { Fragment, useEffect, useState } from 'react'

import cx from 'classnames'

import PanelHeader from '../../codex/components/PanelHeader'
import SearchPanel from '../../codex/components/SearchPanel'
import { useSearchFilters } from '../../codex/hooks/useSearchFilters'
import GradientButton from '../../shared/components/Buttons/GradientButton'
import {
  parseCardDescription,
  isNonCollectible,
  containsNonCollectible,
  isFullMatch,
} from '../../codex/utils/cardHelper'
import CodexLoadingMessage from '../../codex/components/CodexLoadingMessage'
import CodexErrorMessage from '../../codex/components/CodexErrorMessage'
import { useNavigation } from '../../shared/hooks/useNavigation'
import Footer from '../../shared/components/Footer'
import { useCardData } from '../../codex/hooks/useCardData'
import { CardData } from '../../codex/types/cards'
import {
  CircleIcon,
  CrossIcon,
  SkullIcon,
  DoubleStarsIcon,
  SingleStarIcon,
  TripleStarsIcon,
} from '../../shared/utils/icons'
import Header from '../../shared/components/Header'
import { AbracadabraImageUrl } from '../../shared/utils/imageUrls'

import styles from './index.module.scss'

const indexToRarityIconMap = {
  [0]: <CircleIcon className={styles['rarity-icon--common']} />,
  [1]: <SingleStarIcon className={styles['rarity-icon--uncommon']} />,
  [2]: <DoubleStarsIcon className={styles['rarity-icon--rare']} />,
  [3]: <TripleStarsIcon className={styles['rarity-icon--legendary']} />,
  [4]: <SkullIcon className={styles['rarity-icon--monster']} />,
}

function CardCodex(): JSX.Element {
  const { resetToCardCodex } = useNavigation()

  const useCardDataHook = useCardData()
  const { cardData, isLoading, isError, progress } = useCardDataHook

  const useSearchFiltersHook = useSearchFilters(cardData)
  const {
    parsedKeywords,
    matchingCards,
    useCardSetFilters,
    useExtraFilters,
    useFormattingFilters,
    useCardStrike,
  } = useSearchFiltersHook

  const [showCardsWithoutKeywords, setShowCardsWithoutKeywords] = useState(false)

  const { getCardSetNameFromIndex } = useCardSetFilters
  const { shouldIncludeNonCollectibleCards } = useExtraFilters
  const { shouldShowDescription, shouldShowKeywords, shouldShowCardSet, shouldShowRarity } =
    useFormattingFilters
  const { isCardStruck, toggleCardStrike } = useCardStrike

  useEffect(() => {
    if (parsedKeywords.length > 0) {
      setShowCardsWithoutKeywords(false)
    }
  }, [parsedKeywords])

  const findMatchingKeywords = (card: CardData) => {
    const matches = parsedKeywords.filter(
      (keyword) =>
        card.name.toLowerCase().includes(keyword.toLowerCase()) ||
        card.description.toLowerCase().includes(keyword.toLowerCase())
    )

    return `{ ${matches.join(', ')} }`
  }

  const renderMatchingCards = () => {
    const showingCardsWithoutKeywords = parsedKeywords.length === 0 && showCardsWithoutKeywords
    const infoText = showingCardsWithoutKeywords ? (
      <div className={styles['results-container__info']}>
        <div className={styles['results-container__info--warning']}>
          Found <strong>{matchingCards.length}</strong> cards, matching only the filters!
        </div>
        Type something into the search bar to narrow down the result.
      </div>
    ) : (
      <div className={styles['results-container__info']}>
        <strong>{`Found ${matchingCards.length} cards matching:`}</strong>
        <div className={styles['results-container__info__keywords']}>
          {'[ '}
          {parsedKeywords.map((keyword, index) => {
            const fullMatch = matchingCards.some(
              ({ name }) => name.toLowerCase() === keyword.toLowerCase()
            )

            const className = fullMatch
              ? styles['results-container__info__keywords__full-match']
              : ''

            return (
              <Fragment key={keyword}>
                <span className={className}>{keyword}</span>
                <span>{index < parsedKeywords.length - 1 && ', '}</span>
              </Fragment>
            )
          })}
          {` ]`}
        </div>
      </div>
    )

    const cardsByBanner = matchingCards.reduce(
      (acc, card) => {
        acc[card.color] = [...(acc[card.color] || []), card]
        return acc
      },
      {} as Record<number, CardData[]>
    )

    return (
      <div className={styles['results-container']} key={parsedKeywords.join(',')}>
        {infoText}

        {Object.entries(cardsByBanner).map(([banner, cards]) => (
          <div key={banner} className={styles['results-cards']}>
            <div className={styles[`results-cards__banner--${banner}`]}>
              {cards.map((card) => {
                const fullMatch = parsedKeywords.some((keyword) => isFullMatch(card, keyword))
                const className = cx(styles['result-card-container'], {
                  [styles['result-card-container--struck']]: isCardStruck(card),
                  [styles['result-card-container--full-match']]: fullMatch,
                })

                return (
                  <div className={className} key={card.name} onClick={() => toggleCardStrike(card)}>
                    <div className={styles['result-card']}>
                      {shouldShowRarity && (
                        <span className={styles['result-card__rarity']}>
                          {indexToRarityIconMap[card.rarity as keyof typeof indexToRarityIconMap]}
                        </span>
                      )}
                      {shouldIncludeNonCollectibleCards &&
                        containsNonCollectible(matchingCards) && (
                          <span className={styles['result-card__non-collectible']}>
                            {isNonCollectible(card) && <CrossIcon />}
                          </span>
                        )}
                      <span className={styles['result-card__name']}>{card.name}</span>
                      {shouldShowKeywords && !showCardsWithoutKeywords && (
                        <span className={styles['result-card__keywords']}>
                          {findMatchingKeywords(card)}
                        </span>
                      )}
                      {shouldShowCardSet && (
                        <span className={styles['result-card__card-set']}>
                          {getCardSetNameFromIndex(card.expansion) ?? '-'}
                        </span>
                      )}
                    </div>
                    {shouldShowDescription && (
                      <div className={styles['result-card__description']}>
                        {parseCardDescription(card.description)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderNoKeywords = () => (
    <div className={styles['results-container']}>
      <div className={styles['results-container__info']}>
        No <strong>keywords</strong> have been provided yet. Type something into the search bar,
        or...
      </div>

      <GradientButton
        className={styles['results-container__no-keywords-button']}
        subtle
        onClick={() => setShowCardsWithoutKeywords(true)}
      >
        Show <strong>all card matches</strong> based <br />
        only on the filters
      </GradientButton>
    </div>
  )

  const renderRightPanel = () => (
    <div className={styles['right-panel']}>
      <PanelHeader type="Results" />

      {parsedKeywords.length > 0 || showCardsWithoutKeywords
        ? renderMatchingCards()
        : renderNoKeywords()}
    </div>
  )

  return (
    <div className={styles['container']}>
      <Header
        onLogoClick={resetToCardCodex}
        logoSrc={AbracadabraImageUrl}
        title="Dawn-Dash : Cardex"
        subtitle="Dawncaster card search & filter"
        currentPage="cardex"
      />

      <div className={styles['content']}>
        <CodexLoadingMessage isVisible={isLoading} progress={progress} />
        <CodexErrorMessage isVisible={isError && !isLoading} />
        {!isError && !isLoading && (
          <>
            <SearchPanel useSearchFilters={useSearchFiltersHook} useCardData={useCardDataHook} />
            {renderRightPanel()}
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default CardCodex
