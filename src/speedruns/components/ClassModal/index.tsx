import Modal from '@/shared/components/Modals/Modal'
import { ClassColorVariant, getClassColor } from '@/shared/utils/classColors'

import { SpeedRunClass } from '@/speedruns/types/speedRun'

interface ClassModalProps {
  children: React.ReactNode
  selectedClass?: SpeedRunClass
  isOpen: boolean
  onClose: () => void
  maxWidth?: number
}

function ClassModal({
  children,
  selectedClass,
  isOpen,
  onClose,
  maxWidth,
}: ClassModalProps): JSX.Element | null {
  if (!isOpen) return null

  const borderColor = selectedClass
    ? getClassColor(selectedClass, ClassColorVariant.Dark)
    : undefined

  return (
    <Modal borderColor={borderColor} isOpen={isOpen} onClose={onClose} maxWidth={maxWidth}>
      {children}
    </Modal>
  )
}

export default ClassModal
