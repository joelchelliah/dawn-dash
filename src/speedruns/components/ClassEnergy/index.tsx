import Image from 'next/image'

import { createCx } from '@/shared/utils/classnames'

import { SpeedRunClass } from '@/speedruns/types/speedRun'
import { getEnergyImageUrl } from '@/speedruns/utils/images'

import styles from './index.module.scss'

const cx = createCx(styles)

function ClassEnergy({ classType }: { classType: SpeedRunClass }) {
  const imageUrl = getEnergyImageUrl(classType)
  return <Image src={imageUrl} alt="Energy" className={cx('energy')} width={20} height={20} />
}

export default ClassEnergy
