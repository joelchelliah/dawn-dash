import LoadingDots from '@/shared/components/LoadingDots'
import { CharacterClass } from '@/shared/types/characterClass'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'

interface ClassLoadingDotsProps {
  selectedClass?: CharacterClass
  text?: string
}

function ClassLoadingDots({ text, selectedClass }: ClassLoadingDotsProps) {
  const color = getClassColor(selectedClass || CharacterClass.Arcanist, ClassColorVariant.Lighter)

  return <LoadingDots text={text} color={color} />
}

export default ClassLoadingDots
