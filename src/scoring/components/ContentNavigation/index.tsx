import { useState } from 'react'

import { createCx } from '@/shared/utils/classnames'

import { ScoringMode, ScoringPanelId } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ContentLink {
  id: ScoringPanelId
  label: string
  advanced?: boolean
}

interface ContentNavigationProps {
  mode: ScoringMode
  selectedPanelId: ScoringPanelId | null
  onNavigate: (panelId: ScoringPanelId) => void
}

const CONTENT_LINKS: Record<ScoringMode, ContentLink[]> = {
  [ScoringMode.Standard]: [
    { id: ScoringPanelId.StandardScore, label: 'Standard score' },
    { id: ScoringPanelId.ScoringExample, label: 'Scoring example' },
  ],
  [ScoringMode.Sunforge]: [
    { id: ScoringPanelId.SunforgeScore, label: 'Sunforge score' },
    { id: ScoringPanelId.ScoringExample, label: 'Scoring example' },
  ],
  [ScoringMode.WeeklyChallenge]: [
    { id: ScoringPanelId.WeeklyChallengeScore, label: 'Weekly Challenge' },
    { id: ScoringPanelId.StandardScore, label: 'Standard score' },
    { id: ScoringPanelId.BlightbaneScore, label: 'Blightbane score' },
    { id: ScoringPanelId.ScoringExample, label: 'Scoring example' },
    { id: ScoringPanelId.BolgarsBlueprints, label: "Bolgar's Blueprints", advanced: true },
  ],
  [ScoringMode.Blightbane]: [],
}

function ContentNavigation({
  mode,
  selectedPanelId,
  onNavigate,
}: ContentNavigationProps): JSX.Element {
  const [clickedId, setClickedId] = useState<ScoringPanelId | null>(null)
  const links = CONTENT_LINKS[mode]

  if (links.length === 0) {
    return <></>
  }

  const handleClick = (panelId: ScoringPanelId) => {
    setClickedId(panelId)
    setTimeout(() => setClickedId(null), 300)
    onNavigate(panelId)
  }

  return (
    <div className={cx('content-navigation')}>
      <h3 className={cx('title')}>Content</h3>
      <ul className={cx('list')}>
        {links.map(({ id, label, advanced }) => {
          const isSelected = selectedPanelId === id
          const isClicked = clickedId === id

          return (
            <li key={id} className={cx('item')}>
              <button
                className={cx('link', `link--${mode}`, {
                  'link--selected': isSelected,
                  'link--clicked': isClicked,
                })}
                onClick={() => handleClick(id)}
              >
                {label}
                {advanced && <span className={cx('advanced-tag')}>Advanced</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default ContentNavigation
