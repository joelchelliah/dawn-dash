import { SpeedRunClass } from '../../types/speedRun'
import { getEnergyImageUrl } from '../../utils/images'

import './index.scss'

function ClassEnergy({ classType }: { classType: SpeedRunClass }) {
  const imageUrl = getEnergyImageUrl(classType)

  return <img src={imageUrl} alt="Energy" className="energy-image" />
}

export default ClassEnergy
