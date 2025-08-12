import Image from 'next/image'

import { SpeedRunClass } from '../../types/speedRun'
import { getEnergyImageUrl } from '../../utils/images'

import styles from './index.module.scss'

function ClassEnergy({ classType }: { classType: SpeedRunClass }) {
  const imageUrl = getEnergyImageUrl(classType)

  return <Image src={imageUrl} alt="Energy" className={styles['energy']} width={20} height={20} />
}

export default ClassEnergy
