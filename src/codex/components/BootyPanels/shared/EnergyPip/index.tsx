import ClassEnergy from '@/shared/components/ClassEnergy'
import { CharacterClass } from '@/shared/types/characterClass'
import { createCx } from '@/shared/utils/classnames'

import cardModalStyles from '../CardModal/index.module.scss'

const cx = createCx(cardModalStyles)

interface EnergyPipProps {
  classType: CharacterClass
}

function EnergyPip({ classType }: EnergyPipProps): JSX.Element {
  return (
    <span className={cx('card-modal__hint__energy')}>
      <ClassEnergy classType={classType} />
    </span>
  )
}

export default EnergyPip
