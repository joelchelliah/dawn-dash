import { useCallback, useMemo, useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import InfoModal from '@/shared/components/Modals/InfoModal'
import Code from '@/shared/components/Code'

import { ScoringMode, WeeklyChallengeData } from '@/scoring/types'
import { getAccuracyWindowRange } from '@/scoring/utils/advancedScoring'
import { ACCURACY_PENALTY_RATE } from '@/scoring/constants/scoring'

import Highlight from '../Highlight'
import ScoringList from '../ScoringList'
import ScoringTable from '../ScoringTable'
import ScoringButton from '../ScoringButton'

import MalignancyScalingList from './MalignancyScalingList'
import styles from './index.module.scss'

const cx = createCx(styles)

interface AccuracyBonusScoringProps {
  challengeData: WeeklyChallengeData
}

function AccuracyBonusScoring({ challengeData }: AccuracyBonusScoringProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { scoring } = challengeData
  const { accuracyBaseValue, allowNegativeAccuracy, target, buffer } = scoring

  const getDerivedAccuracyRange = useCallback(
    (offset: number) => {
      if (offset === 0) {
        return getAccuracyWindowRange(target, buffer)
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
    },
    [target, buffer]
  )

  const accuracyTableColumns = useMemo(
    () => [
      { header: 'Cards in deck', accessor: 'cards' as const, className: 'bold' },
      { header: 'Penalty', accessor: 'penalty' as const, className: 'value' },
      { header: 'Base score', accessor: 'score' as const, className: 'highlighted' },
    ],
    []
  )

  const accuracyTableData = useMemo(
    () =>
      [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
        if (offset === 0) {
          return {
            cards: (
              <Highlight mode={ScoringMode.Blightbane} strong>
                {getDerivedAccuracyRange(0)}
              </Highlight>
            ),
            penalty: (
              <Highlight mode={ScoringMode.Blightbane} strong>
                0
              </Highlight>
            ),
            score: accuracyBaseValue,
          }
        }

        const penaltyRate = ACCURACY_PENALTY_RATE * Math.abs(offset)
        return {
          cards: getDerivedAccuracyRange(offset),
          penalty: accuracyBaseValue * penaltyRate,
          score: accuracyBaseValue * (1 - penaltyRate),
        }
      }),
    [accuracyBaseValue, getDerivedAccuracyRange]
  )

  return (
    <div className={cx('scoring-container')}>
      <p>
        This bonus scales with your <strong>malignancy level</strong>.
      </p>
      <ScoringList mode={ScoringMode.Blightbane}>
        <li>
          <strong>Accuracy base value:</strong>{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {accuracyBaseValue}
          </Highlight>
        </li>
        <li>
          <strong>Allow negative accuracy:</strong>{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {allowNegativeAccuracy ? 'Yes' : 'No'}
          </Highlight>
        </li>
        <li>
          <strong>Target:</strong>{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {target}
          </Highlight>
        </li>
        <li>
          <strong>Buffer:</strong>{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {buffer}
          </Highlight>
        </li>
      </ScoringList>
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
        className={cx('table')}
      />
      <p>
        <strong>Malignancy</strong>-based scaling for a perfect <strong>accuracy</strong> bonus (
        <Code>
          <strong>{getDerivedAccuracyRange(0)}</strong>
        </Code>
        ):
      </p>
      <MalignancyScalingList baseValue={accuracyBaseValue} />

      <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h4 className={cx('explain-settings-header')}>🎯 &nbsp;Accuracy bonus settings</h4>
        <div className={cx('explain-settings-item-header')}>
          Base value:{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {accuracyBaseValue}
          </Highlight>
        </div>
        <p>
          You start with a <Highlight mode={ScoringMode.Blightbane}>{accuracyBaseValue}</Highlight>{' '}
          base accuracy score, which you will keep if you finish the challenge within the{' '}
          <strong>accuracy window</strong>.
        </p>
        <hr className={cx('divider')} />
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
        <p>
          You are penalized by <strong>10%</strong> (
          <Highlight mode={ScoringMode.Blightbane}>
            {accuracyBaseValue * ACCURACY_PENALTY_RATE}
          </Highlight>
          ) points for every <Highlight mode={ScoringMode.Blightbane}>{buffer}</Highlight> cards you
          are away from the target (<Highlight mode={ScoringMode.Blightbane}>{target}</Highlight>).
          Either above or below the target.
          <br />
          Passing the buffer once will put outside the <strong>
            derived accuracy window:
          </strong>{' '}
          <span style={{ whiteSpace: 'nowrap' }}>
            [{' '}
            <Highlight mode={ScoringMode.Blightbane} strong>
              {getAccuracyWindowRange(target, buffer)}
            </Highlight>{' '}
            ]
          </span>
          .
        </p>
        <hr className={cx('divider')} />
        <div className={cx('explain-settings-item-header')}>
          Allow negative accuracy:{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {allowNegativeAccuracy ? 'Yes' : 'No'}
          </Highlight>
        </div>
        <p>
          If enabled, you can get a negative accuracy score by passing the <strong>buffer</strong>{' '}
          more than ten times.
        </p>
      </InfoModal>
    </div>
  )
}

export default AccuracyBonusScoring
