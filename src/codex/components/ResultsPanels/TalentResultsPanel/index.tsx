import { useEffect, useState, useMemo } from 'react'

import GradientButton from '@/shared/components/Buttons/GradientButton'
import { createCx } from '@/shared/utils/classnames'

import { TalentTreeNode, TalentTreeNodeType } from '@/codex/types/talents'
import { UseAllTalentSearchFilters } from '@/codex/hooks/useSearchFilters'
import { useExpandableNodes } from '@/codex/hooks/useExpandableNodes'

import PanelHeader from '../../PanelHeader'
import KeywordsSummary from '../KeywordsSummary'

import TalentTree from './TalentTree'
import styles from './index.module.scss'

interface TalentResultsPanelProps {
  useSearchFilters: UseAllTalentSearchFilters
}

const cx = createCx(styles)

const TalentResultsPanel = ({ useSearchFilters }: TalentResultsPanelProps) => {
  const [showTalentsWithoutKeywords, setShowTalentsWithoutKeywords] = useState(false)
  const { parsedKeywords, matchingTalentTree, useFormattingFilters } = useSearchFilters
  const { shouldExpandNodes } = useFormattingFilters
  const useChildrenExpansion = useExpandableNodes(shouldExpandNodes)

  const matchingTalentNames = useMemo(() => {
    if (!matchingTalentTree) return []

    function collectTalentNames(nodes: TalentTreeNode[]): string[] {
      const namesSet = new Set<string>()

      function traverse(nodes: TalentTreeNode[]) {
        for (const node of nodes) {
          if (node.type === TalentTreeNodeType.TALENT) {
            namesSet.add(node.name)
            traverse(node.children)
          } else {
            traverse(node.children)
          }
        }
      }

      traverse(nodes)
      return Array.from(namesSet)
    }

    return collectTalentNames([
      ...(matchingTalentTree.noReqNode.children ?? []),
      ...(matchingTalentTree.energyNodes ?? []),
      ...(matchingTalentTree.classNodes ?? []),
      ...(matchingTalentTree.eventNodes.flatMap((node) => node.children) ?? []),
      ...(matchingTalentTree.offerNode.children ?? []),
    ])
  }, [matchingTalentTree])

  useEffect(() => {
    if (parsedKeywords.length > 0) {
      setShowTalentsWithoutKeywords(false)
    }
  }, [parsedKeywords])

  const renderMatchingTalents = () => {
    const showingTalentsWithoutKeywords = parsedKeywords.length === 0 && showTalentsWithoutKeywords

    return (
      <div className={cx('results-container')} key={parsedKeywords.join(',')}>
        <KeywordsSummary
          matches={matchingTalentNames}
          resultType="talent"
          parsedKeywords={parsedKeywords}
          showingResultsWithoutKeywords={showingTalentsWithoutKeywords}
          className={cx('results-container__info')}
        />

        <TalentTree
          talentTree={matchingTalentTree}
          useSearchFilters={useSearchFilters}
          useChildrenExpansion={useChildrenExpansion}
        />
      </div>
    )
  }

  return (
    <div className={cx('results-panel')}>
      <PanelHeader type="TalentResults" />

      {parsedKeywords.length > 0 || showTalentsWithoutKeywords ? (
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
            onClick={() => setShowTalentsWithoutKeywords(true)}
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
