import { useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import InfoModal from '@/shared/components/Modals/InfoModal'

import { ScoringMode, WeeklyChallengeData } from '@/scoring/types'

import Highlight from '../Highlight'
import ScoringList from '../ScoringList'
import ScoringTable from '../ScoringTable'
import ScoringButton from '../ScoringButton'

import styles from './index.module.scss'

const cx = createCx(styles)

interface AccuracyBonusScoringProps {
  challengeData: WeeklyChallengeData
}

function AccuracyBonusScoring({ challengeData }: AccuracyBonusScoringProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { scoring } = challengeData
  const { accuracyBaseValue, allowNegativeAccuracy, target, buffer } = scoring

  const getDerivedRange = (offset: number) => {
    if (offset === 0) {
      return `${target - buffer + 1} - ${target + buffer - 1}`
    }
    if (offset < 0) {
      const end = target - buffer + 2 + (offset + 1) * buffer
      const start = end - buffer + 1
      return `${start} - ${end}`
    }
    // offset > 0
    const start = target + buffer + (offset - 1) * buffer
    const end = start + buffer - 1
    return `${start} - ${end}`
  }

  const accuracyTableColumns = [
    { header: 'Cards in deck', accessor: 'cards' as const, className: 'bold' },
    { header: 'Penalty', accessor: 'penalty' as const, className: 'value' },
    { header: 'Base score', accessor: 'score' as const, className: 'highlighted' },
  ]
  const accuracyTableData = [
    {
      cards: getDerivedRange(-3),
      penalty: accuracyBaseValue * 0.3,
      score: accuracyBaseValue * 0.7,
    },
    {
      cards: getDerivedRange(-2),
      penalty: accuracyBaseValue * 0.2,
      score: accuracyBaseValue * 0.8,
    },
    {
      cards: getDerivedRange(-1),
      penalty: accuracyBaseValue * 0.1,
      score: accuracyBaseValue * 0.9,
    },
    {
      cards: (
        <Highlight mode={ScoringMode.Blightbane} strong>
          {getDerivedRange(0)}
        </Highlight>
      ),
      penalty: (
        <Highlight mode={ScoringMode.Blightbane} strong>
          0
        </Highlight>
      ),
      score: accuracyBaseValue,
    },
    {
      cards: getDerivedRange(1),
      penalty: accuracyBaseValue * 0.1,
      score: accuracyBaseValue * 0.9,
    },
    {
      cards: getDerivedRange(2),
      penalty: accuracyBaseValue * 0.2,
      score: accuracyBaseValue * 0.8,
    },
    {
      cards: getDerivedRange(3),
      penalty: accuracyBaseValue * 0.3,
      score: accuracyBaseValue * 0.7,
    },
  ]

  return (
    <>
      <p>
        This bonus will scale with your <strong>malignancy level</strong>! The accuracy
        score-related settings are:
      </p>
      <ScoringList
        mode={ScoringMode.Blightbane}
        items={[
          <>
            <strong>Accuracy base value:</strong>{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {accuracyBaseValue}
            </Highlight>
          </>,
          <>
            <strong>Allow negative accuracy:</strong>{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {allowNegativeAccuracy ? 'Yes' : 'No'}
            </Highlight>
          </>,
          <>
            <strong>Target:</strong>{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {target}
            </Highlight>
          </>,
          <>
            <strong>Buffer:</strong>{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {buffer}
            </Highlight>
          </>,
        ]}
      />
      <ScoringButton
        mode={ScoringMode.Blightbane}
        onClick={() => setIsModalOpen(true)}
        className={cx('explain-settings-button')}
      >
        Explain these settings
      </ScoringButton>
      <ScoringTable
        mode={ScoringMode.Blightbane}
        columns={accuracyTableColumns}
        data={accuracyTableData}
        className={cx('accuracy-scoring-table')}
      />

      <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h3>Accuracy bonus settings</h3>
        <p>
          <div className={cx('explain-settings-item-header')}>
            Base value:{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {accuracyBaseValue}
            </Highlight>
          </div>
          You start with a <Highlight mode={ScoringMode.Blightbane}>{accuracyBaseValue}</Highlight>{' '}
          base accuracy score, which you will keep if you finish the challenge within the{' '}
          <strong>accuracy window</strong>.
        </p>
        <hr className={cx('divider')} />
        <p>
          <div className={cx('explain-settings-item-header')}>
            Target:{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {target}
            </Highlight>
          </div>
          <div className={cx('explain-settings-item-header')}>
            Buffer:{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {buffer}
            </Highlight>
          </div>
          You are penalized by <strong>10%</strong> (
          <Highlight mode={ScoringMode.Blightbane}>{accuracyBaseValue * 0.1}</Highlight>) points for
          every <Highlight mode={ScoringMode.Blightbane}>{buffer}</Highlight> cards you are away
          from the target (<Highlight mode={ScoringMode.Blightbane}>{target}</Highlight>). Either
          above or below the target.
          <br />
          Passing the buffer once will put outside the <strong>
            derived accuracy window:
          </strong> [{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {target - buffer + 1} - {target + buffer - 1}
          </Highlight>{' '}
          ].
        </p>
        <hr className={cx('divider')} />
        <p>
          <div className={cx('explain-settings-item-header')}>
            Allow negative accuracy:{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {allowNegativeAccuracy ? 'Yes' : 'No'}
            </Highlight>
          </div>
          If enabled, you can get a negative accuracy score by passing the <strong>buffer</strong>{' '}
          more than ten times.
        </p>
      </InfoModal>
    </>
  )
}

export default AccuracyBonusScoring
