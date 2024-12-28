import { SpeedRunClass } from '../../types/speedRun'
import { getEnergyImageUrl } from '../../utils/images'

import styles from './index.module.scss'

function ClassEnergy({ classType }: { classType: SpeedRunClass }) {
  const imageUrl = getEnergyImageUrl(classType)

  return <img src={imageUrl} alt="Energy" className={styles['energy']} />
}

export default ClassEnergy
