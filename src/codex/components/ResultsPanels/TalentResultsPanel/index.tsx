import { useEffect, useState } from 'react'

import GradientButton from '../../../../shared/components/Buttons/GradientButton'
import { UseTalentSearchFilters } from '../../../hooks/useSearchFilters'
import PanelHeader from '../../PanelHeader'
import { createCx } from '../../../../shared/utils/classnames'
import KeywordsSummary from '../KeywordsSummary'

import styles from './index.module.scss'
import TalentTree from './TalentTree'

interface TalentResultsPanelProps {
  useSearchFilters: UseTalentSearchFilters
}

const cx = createCx(styles)

const TalentResultsPanel = ({ useSearchFilters }: TalentResultsPanelProps) => {
  const [showCardsWithoutKeywords, setShowCardsWithoutKeywords] = useState(false)
  const { parsedKeywords, matchingTalents } = useSearchFilters

  useEffect(() => {
    if (parsedKeywords.length > 0) {
      setShowCardsWithoutKeywords(false)
    }
  }, [parsedKeywords])

  const renderMatchingTalents = () => {
    const showingTalentsWithoutKeywords = parsedKeywords.length === 0 && showCardsWithoutKeywords

    return (
      <div className={cx('results-container')} key={parsedKeywords.join(',')}>
        <KeywordsSummary
          matches={matchingTalents.map((talent) => talent.name)}
          parsedKeywords={parsedKeywords}
          showingResultsWithoutKeywords={showingTalentsWithoutKeywords}
          className={cx('results-container__info')}
        />

        <TalentTree talents={matchingTalents} />
      </div>
    )
  }

  return (
    <div className={cx('results-panel')}>
      <PanelHeader type="Results" />

      {parsedKeywords.length > 0 || showCardsWithoutKeywords ? (
        renderMatchingTalents()
      ) : (
        <div className={cx('results-container')}>
          <div className={cx('results-container__info')}>
            No <strong>keywords</strong> have been provided yet. Type something into the search bar,
            or...
          </div>

          <GradientButton
            className={cx('results-container__no-keywords-button')}
            subtle
            onClick={() => setShowCardsWithoutKeywords(true)}
          >
            Show <strong>all talents</strong> matching
            <br />
            only the filters
          </GradientButton>
        </div>
      )}
    </div>
  )
}

export default TalentResultsPanel
