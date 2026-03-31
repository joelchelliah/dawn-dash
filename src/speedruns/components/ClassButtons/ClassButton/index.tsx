import { memo } from 'react'

import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'
import { CharacterClass } from '@/shared/types/characterClass'
import IllustratedButton from '@/shared/components/Buttons/IllustratedButton'

import { getClassImageUrl } from '@/speedruns/utils/images'

interface ClassButtonProps {
  classType: CharacterClass
  isActive: boolean
  onClick: () => void
}

function ClassButton({ classType, isActive, onClick }: ClassButtonProps) {
  const imageUrl = getClassImageUrl(classType)
  const color = getClassColor(
    classType,
    isActive ? ClassColorVariant.Lighter : ClassColorVariant.Default
  )
  const borderColor = getClassColor(
    classType,
    isActive ? ClassColorVariant.Lighter : ClassColorVariant.Darker
  )

  return (
    <IllustratedButton
      imageUrl={imageUrl}
      label={classType}
      isActive={isActive}
      onClick={onClick}
      color={color}
      borderColor={borderColor}
      imageAlt={`${classType} icon`}
    />
  )
}

export default memo(ClassButton)
