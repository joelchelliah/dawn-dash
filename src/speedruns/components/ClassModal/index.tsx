import Modal from '../../../shared/components/Modals/Modal'
import { SpeedRunClass } from '../../types/speedRun'
import { getClassColor, ClassColorVariant } from '../../utils/colors'

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
