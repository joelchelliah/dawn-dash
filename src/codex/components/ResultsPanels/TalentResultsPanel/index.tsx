import { useEffect, useState, useMemo } from 'react'

import GradientButton from '@/shared/components/Buttons/GradientButton'
import { createCx } from '@/shared/utils/classnames'
import { CharacterClass } from '@/shared/types/characterClass'
import { useBreakpoint } from '@/shared/hooks/useBreakpoint'

import { TalentTreeNode, TalentTreeNodeType } from '@/codex/types/talents'
import { UseAllTalentSearchFilters } from '@/codex/hooks/useSearchFilters'
import { useExpandableNodes } from '@/codex/hooks/useExpandableNodes'
import { ZoomLevel } from '@/codex/constants/zoomValues'
import StickyZoomSelect from '@/codex/components/shared/StickyZoomSelect'
import { useStickyZoom } from '@/codex/hooks/useStickyZoom'

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
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(ZoomLevel.COVER)
  const { isMobile } = useBreakpoint()
  const { parsedKeywords, matchingTalentTree, useFormattingFilters } = useSearchFilters
  const { shouldExpandNodes } = useFormattingFilters
  const useChildrenExpansion = useExpandableNodes(shouldExpandNodes)
  const showStickyZoom = useStickyZoom(0, 1300)

  // We want the sticky zoom to move to the top once the user scrolls down a bit.
  useEffect(() => {
    const handleScroll = () => {
      document.documentElement.style.setProperty(
        '--sticky-zoom-margin',
        window.scrollY > 100 ? '-2rem' : '6rem'
      )
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
    // Reset zoom to Cover when keywords change
    setZoomLevel(ZoomLevel.COVER)
  }, [parsedKeywords])

  const renderMatchingTalents = () => {
    const showingTalentsWithoutKeywords = parsedKeywords.length === 0 && showTalentsWithoutKeywords

    return (
      <div className={cx('results-container')}>
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
          zoomLevel={zoomLevel}
        />
      </div>
    )
  }

  const hasResults = parsedKeywords.length > 0 || showTalentsWithoutKeywords
  const showZoomControl = hasResults && showStickyZoom

  return (
    <div className={cx('results-panel')}>
      <PanelHeader type="TalentResults" />

      {showZoomControl && (
        <StickyZoomSelect
          position={isMobile ? 'left' : 'right'}
          className={cx('results-panel__sticky-zoom')}
          selectedClass={CharacterClass.Rogue}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          disabled={!matchingTalentTree}
        />
      )}

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
