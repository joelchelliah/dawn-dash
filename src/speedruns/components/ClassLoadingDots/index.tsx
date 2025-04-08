import LoadingDots from '../../../shared/components/LoadingDots'
import { SpeedRunClass } from '../../types/speedRun'
import { getClassColor, ClassColorVariant } from '../../utils/colors'

interface ClassLoadingDotsProps {
  selectedClass?: SpeedRunClass
  text?: string
}

function ClassLoadingDots({ text, selectedClass }: ClassLoadingDotsProps) {
  const color = getClassColor(selectedClass || SpeedRunClass.Arcanist, ClassColorVariant.Lighter)

  return <LoadingDots text={text} color={color} />
}

export default ClassLoadingDots
