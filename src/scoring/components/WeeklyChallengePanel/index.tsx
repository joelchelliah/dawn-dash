import { createCx } from '@/shared/utils/classnames'
import { ArcaneMissileImageUrl } from '@/shared/utils/imageUrls'
import GradientLink from '@/shared/components/GradientLink'

import { ScoringMode } from '@/scoring/types'

import CollapsiblePanel from '../CollapsiblePanel'
import IllustratedScoringInfo from '../IllustratedScoringInfo'
import Highlight from '../Highlight'
import ScoringList from '../ScoringList'
import ExampleBox from '../ExampleBox'

import styles from './index.module.scss'

const cx = createCx(styles)

function WeeklyChallengePanel(): JSX.Element {
  const mode = ScoringMode.WeeklyChallenge

  return (
    <CollapsiblePanel
      title={'Weekly Challenge Score'}
      imageUrl={ArcaneMissileImageUrl}
      mode={mode}
      collapsible
      defaultExpanded
      isLongTitle
    >
      <div className={cx('content')}>
        <p>
          Your <Highlight mode={mode}>Weekly Challenge</Highlight> score is determined by the
          following two factors:
        </p>
        <ScoringList
          mode={mode}
          items={[
            <>
              Your entire in-game <Highlight mode={ScoringMode.Standard}>Standard</Highlight> mode
              score.
            </>,
            <>
              A third-party <Highlight mode={ScoringMode.Blightbane}>Blightbane</Highlight> score,
              awarded by how well you perform in the specific goals of the challenge.
            </>,
          ]}
        />
        <p>
          Once your <Highlight mode={mode}>Weekly Challenge</Highlight> run is submitted, the{' '}
          <Highlight mode={ScoringMode.Blightbane}>Blightbane</Highlight> score is calculated and
          added to your <Highlight mode={ScoringMode.Standard}>Standard</Highlight> score to get the
          final total score.
        </p>

        <IllustratedScoringInfo
          mode={mode}
          imageSrc={'/scoring/weekly-intro.webp'}
          imageAlt="In-Game Score Example"
        >
          <div className={cx('illustrated-info')}>
            <p>
              Details about the current <strong>Weekly Challenge</strong> can be found in the game,
              as well as on the <strong>Blightbane</strong> website, and the{' '}
              <strong>Discord Weekly channel</strong>.
              <br />
              <br />
              You can browse all current and past challenges{' '}
              <GradientLink text=" here" url="https://blightbane.io/challenges" />, to see their
              unique setups, special objectives and scoring parameters.
            </p>
            <p>
              There&apos;s a{' '}
              <GradientLink text="summary page" url="https://blightbane.io/deck/1774781247585" />{' '}
              for each submitted run, containing:
            </p>
            <br />
            <ScoringList
              mode={mode}
              items={[
                <>
                  Your <strong>🏆 Total score</strong> (with the Blightbane score shown in green
                  next to it).
                </>,
                <>
                  A small (incomplete) summary of your in-game{' '}
                  <Highlight mode={ScoringMode.Standard}>Standard</Highlight> score.
                </>,
                <>Your cards, talents, malignancies and boss fights.</>,
                <>
                  A detailed breakdown of how well you did on your{' '}
                  <Highlight mode={ScoringMode.Blightbane}>Blightbane</Highlight> score parameters.
                </>,
              ]}
            />
          </div>
        </IllustratedScoringInfo>

        <p>
          The two sections below will cover the{' '}
          <Highlight mode={ScoringMode.Standard}>Standard</Highlight> scoring and{' '}
          <Highlight mode={ScoringMode.Blightbane}>Blightbane</Highlight> scoring in full detail.
        </p>

        <ExampleBox mode={mode} emoji="ℹ️">
          <p>
            You can set your Discord username in the game to automatically submit your Weekly runs
            to the Blightbane website. Alternatively, you can manually submit your run later via the{' '}
            <strong>Dawncaster Discord</strong> Weekly channel.
          </p>
        </ExampleBox>
      </div>
    </CollapsiblePanel>
  )
}

export default WeeklyChallengePanel
