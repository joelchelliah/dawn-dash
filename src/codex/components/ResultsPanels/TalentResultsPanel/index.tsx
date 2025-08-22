import { useEffect, useState } from 'react'

import GradientButton from '@/shared/components/Buttons/GradientButton'
import { createCx } from '@/shared/utils/classnames'

import { TalentTreeNode, TalentTreeNodeType } from '@/codex/types/talents'
import { UseAllTalentSearchFilters } from '@/codex/hooks/useSearchFilters'

import PanelHeader from '../../PanelHeader'
import KeywordsSummary from '../KeywordsSummary'

import TalentTree from './TalentTree'
import styles from './index.module.scss'

interface TalentResultsPanelProps {
  useSearchFilters: UseAllTalentSearchFilters
}

const cx = createCx(styles)

const TalentResultsPanel = ({ useSearchFilters }: TalentResultsPanelProps) => {
  const [showCardsWithoutKeywords, setShowCardsWithoutKeywords] = useState(false)
  const { parsedKeywords, matchingTalentTree } = useSearchFilters

  function collectTalentNames(nodes: TalentTreeNode[]): string[] {
    let names: string[] = []
    for (const node of nodes) {
      if (node.type === TalentTreeNodeType.TALENT) {
        names.push(node.name)
        names = names.concat(collectTalentNames(node.children))
      } else {
        names = names.concat(collectTalentNames(node.children))
      }
    }
    return names
  }

  const allTalentNames = collectTalentNames([
    ...(matchingTalentTree?.offerNode.children ?? []),
    ...(matchingTalentTree?.noReqNode.children ?? []),
    ...(matchingTalentTree?.energyNodes ?? []),
    ...(matchingTalentTree?.classNodes ?? []),
  ])

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
          matches={allTalentNames}
          parsedKeywords={parsedKeywords}
          showingResultsWithoutKeywords={showingTalentsWithoutKeywords}
          className={cx('results-container__info')}
        />

        <TalentTree talentTree={matchingTalentTree} />
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
            No <strong>keywords</strong> have been provided yet. Do you want to see all talents
            matching only the filters?
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
