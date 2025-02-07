import { memo } from 'react'

import cx from 'classnames'

import { SpeedRunSubclass } from '../../../types/speedRun'
import { getSubclassColor } from '../../../utils/colors'
import { getEnergyImageUrl } from '../../../utils/images'

import styles from './index.module.scss'

interface SubclassButtonProps {
  subclass: SpeedRunSubclass
  isActive: boolean
  onClick: () => void
}

function getSubclassIcons(subclass: SpeedRunSubclass) {
  if (subclass === SpeedRunSubclass.Hybrid) {
    const icon1 = getEnergyImageUrl(SpeedRunSubclass.Arcanist)
    const icon2 = getEnergyImageUrl(SpeedRunSubclass.Warrior)
    const icon3 = getEnergyImageUrl(SpeedRunSubclass.Rogue)

    return (
      <div className={styles['subclass-icons']}>
        <img src={icon1} alt={`${subclass} icon`} />
        <img src={icon2} alt={`${subclass} icon`} />
        <img src={icon3} alt={`${subclass} icon`} />
      </div>
    )
  }

  const iconUrl = getEnergyImageUrl(subclass)

  return (
    <div className={styles['subclass-icons']}>
      <img src={iconUrl} alt={`${subclass} icon`} />
    </div>
  )
}

function SubclassButton({ subclass, isActive, onClick }: SubclassButtonProps) {
  const icons = getSubclassIcons(subclass)
  const color = getSubclassColor(subclass, isActive)
  const borderColor = getSubclassColor(subclass, isActive)
  const buttonClassName = cx(styles['container'], {
    [styles['container--active']]: isActive,
  })

  return (
    <button
      className={buttonClassName}
      onClick={onClick}
      style={{
        borderColor,
        boxShadow: isActive ? `0 0 8px 1px ${borderColor}20` : undefined,
      }}
    >
      {icons}
      <span className={styles['subclass-type']} style={{ color }}>
        {subclass}
      </span>
    </button>
  )
}

export default memo(SubclassButton)
