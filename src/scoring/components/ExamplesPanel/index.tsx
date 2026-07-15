import { useState } from 'react'

import {
  AnimaImageUrl,
  SongOfLoversImageUrl,
  SongOfSagesImageUrl,
  SongOfSlaughterImageUrl,
} from '@/shared/utils/imageUrls'
import { createCx } from '@/shared/utils/classnames'
import Code from '@/shared/components/Code'
import GradientLink from '@/shared/components/GradientLink'
import Modal from '@/shared/components/Modals/Modal'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'

import { ScoringMode } from '@/scoring/types'

import BasePanel from '../BasePanel'
import Highlight from '../Highlight'
import IllustratedScoringInfo from '../IllustratedScoringInfo'
import ScoringList from '../ScoringList'
import CenteredImage from '../CenteredImage'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ExampleParameterScore {
  label: string
  score: number
  description: React.ReactNode
}

const STANDARD_EXAMPLE_SCORES: ExampleParameterScore[] = [
  {
    label: '💀 Bosses defeated',
    score: 6000,
    description: (
      <>
        All bosses on <strong>Impossible</strong> difficulty.
      </>
    ),
  },
  { label: '❤️ Awareness', score: 750, description: 'Less than 100 damage taken.' },
  { label: '⚔️ Damage', score: 2000, description: 'Over 5000 damage dealt.' },
  { label: '💨 Lethality', score: 500, description: 'Averaged 2 turns per fight.' },
  { label: '🃏 Versatility', score: 500, description: 'Over 19 cards in deck.' },
  { label: '💰 Wealth', score: 1250, description: 'Over 1500 gold + deck value.' },
]

const SUNFORGE_EXAMPLE_SCORES: ExampleParameterScore[] = [
  { label: '💀 Bosses defeated', score: 11750, description: 'All 32 bosses.' },
  { label: '❤️ Awareness', score: 300, description: 'Less than 500 damage taken.' },
  { label: '⚔️ Damage', score: 500, description: 'Over 100 damage dealt.' },
  { label: '💨 Lethality', score: 450, description: 'Averaged 3 turns per fight.' },
  { label: '🃏 Versatility', score: 250, description: 'Over 9 cards in deck.' },
  { label: '💰 Wealth', score: 350, description: 'Over 900 gold + deck value.' },
]

const WEEKLY_STANDARD_EXAMPLE_SCORES: ExampleParameterScore[] = [
  {
    label: '💀 Bosses defeated',
    score: 6000,
    description: (
      <>
        All bosses on <strong>Impossible</strong> difficulty.
      </>
    ),
  },
  { label: '❤️ Awareness', score: 0, description: 'Too much damage taken.' },
  { label: '⚔️ Damage', score: 2000, description: 'Over 5000 damage dealt.' },
  { label: '💨 Lethality', score: 250, description: 'Averaged 6 turns per fight.' },
  { label: '🃏 Versatility', score: 250, description: 'Over 9 cards in deck.' },
  { label: '💰 Wealth', score: 1000, description: 'Over 1000 gold + deck value.' },
]

const renderParameterScoreList = (mode: ScoringMode, scores: ExampleParameterScore[]) => (
  <ScoringList mode={mode}>
    {scores.map(({ label, score, description }) => (
      <li key={label}>
        <strong>{label}:</strong> <Highlight mode={mode}>{score}</Highlight>{' '}
        <span className={cx('score-description')}>{description}</span>
      </li>
    ))}
  </ScoringList>
)

type ExamplesPanelProps = {
  mode: ScoringMode
  onNext?: () => void
  onPrevious?: () => void
  isFirstPanel?: boolean
  isLastPanel?: boolean
  panelId?: string
}

function ExamplesPanel({
  mode,
  onNext,
  onPrevious,
  isFirstPanel,
  isLastPanel,
  panelId,
}: ExamplesPanelProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  const getStandardExample = () => (
    <>
      <p>
        This run scores high ranks in most of the parameters. <strong>💀 Bosses defeated</strong>,{' '}
        <strong>⚔️ Damage</strong> and <strong>💨 Lethality</strong> are all maxed out, and only 5
        cards short of hitting the next <strong>🃏 Versatility</strong> rank!
      </p>

      <IllustratedScoringInfo
        mode={mode}
        imageSrc={'/scoring/standard-intro.webp'}
        imageAlt="Standard Mode Score Example"
      >
        <div className={cx('illustrated-info')}>
          <br />
          {renderParameterScoreList(mode, STANDARD_EXAMPLE_SCORES)}
          <br />
          <p>
            This adds up to <Highlight mode={mode}>11,000</Highlight>.
            <br />
            Scaling this with the <strong>180%</strong> malignancy level gives us the{' '}
            <strong>total score</strong> of <Highlight mode={mode}>30,800</Highlight> (
            <Code wrap="mobile">11000 × (1 + 1.8)</Code>
            ).
          </p>
        </div>
      </IllustratedScoringInfo>
    </>
  )

  const getSunforgeExample = () => (
    <>
      <p>
        Score-wise, a quite average run. All parameters are pretty low, except for{' '}
        <strong>💨 Lethality</strong> sitting at rank <strong>VIII</strong>. The number of remaining
        rerolls is rather low, considering how quicly they stack up near the end.
      </p>

      <IllustratedScoringInfo
        mode={mode}
        imageSrc={'/scoring/sunforge-intro.webp'}
        imageAlt="Sunforge Mode Score Example"
      >
        <div className={cx('illustrated-info')}>
          <br />
          {renderParameterScoreList(mode, SUNFORGE_EXAMPLE_SCORES)}
          <br />
          <p>
            This adds up to <Highlight mode={mode}>13,600</Highlight>.
            <br />
            Scaling this with the <strong>23</strong> rerolls (+<strong>4%</strong> bonus each)
            gives us the <strong>total score</strong> of <Highlight mode={mode}>26,112</Highlight> (
            <Code wrap="mobile">13600 × (1 + 23 × 0.04)</Code>
            ).
          </p>
        </div>
      </IllustratedScoringInfo>
    </>
  )

  const getWeeklyChallengeExample = () => (
    <>
      <p>
        A run from the <Highlight mode={ScoringMode.WeeklyChallenge}>Weekly Challenge</Highlight>:{' '}
        <GradientLink text="Improv Therapy" url="https://blightbane.io/challenge/1768503600000" />{' '}
        will be used for this scoring example. Here are the additional{' '}
        <Highlight mode={ScoringMode.Blightbane}>Blightbane</Highlight> bonus objectives for this
        challenge:
      </p>
      <div onClick={() => setIsModalOpen(true)} className={cx('clickable-image-wrapper')}>
        <CenteredImage
          src="/scoring/weekly-example-rules.webp"
          alt="Weekly Challenge Rules"
          width={900}
          height={350}
          renderedWidth={650}
        />
      </div>
      <p>
        Here we cover both the <Highlight mode={ScoringMode.Standard}>Standard</Highlight> mode
        scoring and the <Highlight mode={ScoringMode.Blightbane}>Blightbane</Highlight> scoring of
        the same run. This run has a malignancy level of <strong>135%</strong>.
      </p>
      <IllustratedScoringInfo
        mode={ScoringMode.Standard}
        imageSrc={'/scoring/weekly-example-standard.webp'}
        imageAlt="Weekly Challenge Standard Score Example"
      >
        <div className={cx('illustrated-info')}>
          <br />
          {renderParameterScoreList(ScoringMode.Standard, WEEKLY_STANDARD_EXAMPLE_SCORES)}
          <br />
          <p>
            This adds up to <Highlight mode={ScoringMode.Standard}>9,500</Highlight>.
            <br />
            Scaling this with the <strong>135%</strong> malignancy level gives us the{' '}
            <strong>total score</strong> of{' '}
            <Highlight mode={ScoringMode.Standard}>22,325</Highlight> (
            <Code wrap="mobile">9500 × (1 + 1.35)</Code>
            ).
          </p>
        </div>
      </IllustratedScoringInfo>

      <IllustratedScoringInfo
        mode={ScoringMode.Blightbane}
        imageSrc={'/scoring/weekly-example-blightbane.webp'}
        imageAlt="Weekly Challenge Blightbane Score Example"
      >
        <div className={cx('illustrated-info')}>
          <p>
            <strong>🎖️ Fixed score bonuses</strong> for:
          </p>
          <br />
          <ScoringList mode={ScoringMode.Blightbane}>
            <li>
              Having <strong>Moonclaws</strong> (
              <Highlight mode={ScoringMode.Blightbane}>4 × 500</Highlight>),{' '}
              <strong>Master of Forms</strong> (
              <Highlight mode={ScoringMode.Blightbane}>750</Highlight>), and{' '}
              <strong>Harmony</strong> (<Highlight mode={ScoringMode.Blightbane}>750</Highlight>).
            </li>
            <li>
              Using the <strong>Eternal Hunger</strong> malignancy (
              <Highlight mode={ScoringMode.Blightbane}>3000</Highlight>).
            </li>
            <li>
              Completing the run (<Highlight mode={ScoringMode.Blightbane}>2000</Highlight>).
            </li>
          </ScoringList>
          <br />
          <p>
            <strong>📝 Keywords bonus</strong>, scaled by both <strong>malignancy</strong> and{' '}
            <strong>card rarity</strong>, gives us{' '}
            <Highlight mode={ScoringMode.Blightbane}>2,400</Highlight> points for the 6 distinct{' '}
            <strong>legendaries</strong>, <Highlight mode={ScoringMode.Blightbane}>1,464</Highlight>{' '}
            points for the 5 distinct (and one duplicate) <strong>rares</strong>,{' '}
            <Highlight mode={ScoringMode.Blightbane}>352</Highlight> points for the 2{' '}
            <strong>uncommons</strong>, and so on...
          </p>
          <p>
            Finally, the <strong>🎯 Accuracy bonus</strong>, also scaled by the{' '}
            <strong>malignancy level</strong>, gives us{' '}
            <Highlight mode={ScoringMode.Blightbane}>7050</Highlight> (
            <Code wrap="mobile">3000 × (1 + 1.35)</Code>). This all adds up to the{' '}
            <strong>total score</strong> of{' '}
            <Highlight mode={ScoringMode.Blightbane}>20,091</Highlight>.
          </p>
        </div>
      </IllustratedScoringInfo>

      <p>
        These two scores combined give us the <strong>final total</strong> of{' '}
        <Highlight mode={mode}>42,416</Highlight> (<Code wrap="mobile">22325 + 20091</Code>), as you
        can also see on the run&apos;s{' '}
        <GradientLink text="summary page" url="https://blightbane.io/deck/1768931600277" />.
      </p>
      <p className={cx('follow-up')}>
        At the highest ranks (<strong>VII</strong> and above), the{' '}
        <Highlight mode={ScoringMode.Standard}>Standard</Highlight> mode scoring parameters reward
        you significantly better than the{' '}
        <Highlight mode={ScoringMode.Blightbane}>Blightbane</Highlight> bonuses. These should always
        be prioritized if the challenge offers a clear path to maxing out any of their ranks.
        Especially for the <em>easier</em> ones (like <strong>⚔️ Damage</strong>,{' '}
        <strong>💨 Lethality</strong> and <strong>💰 Wealth</strong>).
      </p>
      <p className={cx('follow-up')}>
        In challenges with a high <strong>accuracy buffer</strong> or a high{' '}
        <strong>keywords bonus</strong> score, it might be more beneficial to prioritize the{' '}
        <Highlight mode={ScoringMode.Blightbane}>Blightbane</Highlight> bonuses. Especially if the
        challenge offers a safe way to continue increasing your score after breaking past the{' '}
        <strong>accuracy window</strong>.
      </p>
    </>
  )

  return (
    <BasePanel
      title={'Scoring example'}
      imageUrl={getImageUrl()}
      mode={mode}
      isLongTitle
      onNext={onNext}
      onPrevious={onPrevious}
      isFirstPanel={isFirstPanel}
      isLastPanel={isLastPanel}
      panelId={panelId}
    >
      <div className={cx('content')}>
        {mode === ScoringMode.Standard && getStandardExample()}
        {mode === ScoringMode.Sunforge && getSunforgeExample()}
        {mode === ScoringMode.WeeklyChallenge && getWeeklyChallengeExample()}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth={1000}
        borderColor={getClassColor(CharacterClass.Knight, ClassColorVariant.Dark)}
      >
        <>
          <br />
          <CenteredImage
            src="/scoring/weekly-example-rules.webp"
            alt="Weekly Challenge Rules"
            width={900}
            height={350}
            renderedWidth={900}
          />
        </>
      </Modal>
    </BasePanel>
  )
}

export default ExamplesPanel
