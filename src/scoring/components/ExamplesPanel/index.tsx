import {
  AnimaImageUrl,
  SongOfLoversImageUrl,
  SongOfSagesImageUrl,
  SongOfSlaughterImageUrl,
} from '@/shared/utils/imageUrls'
import { createCx } from '@/shared/utils/classnames'
import Code from '@/shared/components/Code'

import { ScoringMode } from '@/scoring/types'

import CollapsiblePanel from '../CollapsiblePanel'
import Highlight from '../Highlight'
import IllustratedScoringInfo from '../IllustratedScoringInfo'
import ScoringList from '../ScoringList'

import styles from './index.module.scss'

const cx = createCx(styles)

type ExamplesPanelProps = {
  mode: ScoringMode
}

function ExamplesPanel({ mode }: ExamplesPanelProps): JSX.Element {
  const getImageUrl = () => {
    if (mode === ScoringMode.Standard) {
      return SongOfSlaughterImageUrl
    } else if (mode === ScoringMode.Sunforge) {
      return SongOfSagesImageUrl
    } else if (mode === ScoringMode.WeeklyChallenge) {
      return SongOfLoversImageUrl
    }
    return AnimaImageUrl
  }

  return (
    <CollapsiblePanel
      title={'Scoring example'}
      imageUrl={getImageUrl()}
      mode={mode}
      collapsible
      isLongTitle
    >
      <div className={cx('content')}>
        {mode === ScoringMode.Standard && (
          <>
            <p>
              A very nice <Highlight mode={mode}>Standard</Highlight> mode run, scoring high ranks
              in most of the parameters, including a maxed out <strong>💀 Bosses defeated</strong>,{' '}
              <strong>⚔️ Damage</strong> and <strong>💨 Lethality</strong>!
            </p>

            <IllustratedScoringInfo
              mode={mode}
              imageSrc={'/scoring/standard-intro.webp'}
              imageAlt="Standard Mode Score Example 1"
            >
              <div className={cx('illustrated-info')}>
                <br />
                <ScoringList
                  mode={mode}
                  items={[
                    <>
                      <strong>Bosses defeated:</strong> <Highlight mode={mode}>6000</Highlight> -{' '}
                      <span className={cx('score-description')}>
                        All bosses on <strong>Impossible</strong> difficulty.
                      </span>
                    </>,
                    <>
                      <strong>Awareness:</strong> <Highlight mode={mode}>750</Highlight> -{' '}
                      <span className={cx('score-description')}>Less than 100 damage taken.</span>
                    </>,
                    <>
                      <strong>Damage:</strong> <Highlight mode={mode}>2000</Highlight> -{' '}
                      <span className={cx('score-description')}>Over 5000 damage dealt.</span>
                    </>,
                    <>
                      <strong>Lethality:</strong> <Highlight mode={mode}>500</Highlight> -{' '}
                      <span className={cx('score-description')}>Averaged 2 turns per fight.</span>
                    </>,
                    <>
                      <strong>Versatility:</strong> <Highlight mode={mode}>500</Highlight> -{' '}
                      <span className={cx('score-description')}>Over 19 cards in deck.</span>
                    </>,
                    <>
                      <strong>Wealth:</strong> <Highlight mode={mode}>1250</Highlight> -{' '}
                      <span className={cx('score-description')}>Over 1500 gold + deck value.</span>
                    </>,
                  ]}
                />
                <br />
                <p>
                  This adds up to <Highlight mode={mode}>11,000</Highlight> (
                  <Code wrap="mobile">6000 + 750 + 2000 + 500 + 500 + 1250</Code>). Scaling this
                  with the <strong>180%</strong> Malignancy level gives us the{' '}
                  <strong>total score</strong> of <Highlight mode={mode}>30,800</Highlight> (
                  <Code wrap="mobile">11000 × (1 + 1.8)</Code>).
                </p>
              </div>
            </IllustratedScoringInfo>
          </>
        )}
      </div>
    </CollapsiblePanel>
  )
}

export default ExamplesPanel
