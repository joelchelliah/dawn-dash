import { memo } from 'react'

import Image from 'next/image'
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

const renderIcon = (icon: string, alt: string) => (
  <Image src={icon} alt={alt} width={16} height={16} />
)

function getSubclassIcons(subclass: SpeedRunSubclass) {
  if (subclass === SpeedRunSubclass.Hybrid) {
    const arcanist = getEnergyImageUrl(SpeedRunSubclass.Arcanist)
    const warrior = getEnergyImageUrl(SpeedRunSubclass.Warrior)
    const rogue = getEnergyImageUrl(SpeedRunSubclass.Rogue)

    return (
      <div className={styles['subclass-icons']}>
        {renderIcon(arcanist, `${subclass} icon`)}
        {renderIcon(warrior, `${subclass} icon`)}
        {renderIcon(rogue, `${subclass} icon`)}
      </div>
    )
  }

  const iconUrl = getEnergyImageUrl(subclass)

  return <div className={styles['subclass-icons']}>{renderIcon(iconUrl, `${subclass} icon`)}</div>
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
