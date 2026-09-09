import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { CharacterClass } from '@/shared/types/characterClass'
import { getEnergyImageUrl } from '@/shared/utils/energyImages'

import styles from './index.module.scss'

const cx = createCx(styles)

function ClassEnergy({ classType }: { classType: CharacterClass }) {
  const imageUrl = getEnergyImageUrl(classType)
  return <Image src={imageUrl} alt="Energy" className={cx('energy')} width={20} height={20} />
}

export default ClassEnergy
