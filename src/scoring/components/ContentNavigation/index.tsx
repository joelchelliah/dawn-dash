import { createCx } from '@/shared/utils/classnames'

import { ScoringMode, ScoringPanelId } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ContentLink {
  id: ScoringPanelId
  label: string
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
    { id: ScoringPanelId.BolgarsBlueprints, label: "Bolgar's Blueprints" },
  ],
  [ScoringMode.Blightbane]: [],
}

function ContentNavigation({
  mode,
  selectedPanelId,
  onNavigate,
}: ContentNavigationProps): JSX.Element {
  const links = CONTENT_LINKS[mode]

  if (links.length === 0) {
    return <></>
  }

  return (
    <div className={cx('content-navigation')}>
      <h3 className={cx('title')}>Content</h3>
      <ul className={cx('list')}>
        {links.map((link) => {
          const isSelected = selectedPanelId === link.id

          return (
            <li key={link.id} className={cx('item')}>
              <button
                className={cx('link', `link--${mode}`, {
                  'link--selected': isSelected,
                })}
                onClick={() => onNavigate(link.id)}
              >
                {link.label}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default ContentNavigation
