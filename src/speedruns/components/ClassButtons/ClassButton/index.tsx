import { memo } from 'react'

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

  return (
    <IllustratedButton
      imageUrl={imageUrl}
      isActive={isActive}
      onClick={onClick}
      classType={classType}
      imageAlt={`${classType} icon`}
    />
  )
}

export default memo(ClassButton)
