import { createCx } from '@/shared/utils/classnames'

import { ScoringMode } from '@/scoring/types'

import Highlight from '../Highlight'

import styles from './index.module.scss'

const cx = createCx(styles)

interface UnsupportedCalculationTypeProps {
  calculationType: string
}

function UnsupportedCalculationType({
  calculationType,
}: UnsupportedCalculationTypeProps): JSX.Element {
  return (
    <div className={cx('unavailable')}>
      <p>
        This section is not yet implemented for calculation type:{' '}
        <Highlight mode={ScoringMode.Blightbane} strong>
          {calculationType}
        </Highlight>
        .
      </p>
    </div>
  )
}

export default UnsupportedCalculationType
