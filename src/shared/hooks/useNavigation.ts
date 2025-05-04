import { useNavigate } from 'react-router-dom'

export const useNavigation = () => {
  const navigate = useNavigate()

  const resetToSpeedruns = (selectedClass: string, difficulty: string) => {
    navigate(`/?class=${selectedClass}&difficulty=${difficulty}`, { replace: true })
    window.location.reload()
  }

  const resetToCardCodex = () => {
    navigate('/codex/cards', { replace: true })
    window.location.reload()
  }

  const resetToTalentCodex = () => {
    navigate('/codex/talents', { replace: true })
    window.location.reload()
  }

  return { resetToSpeedruns, resetToCardCodex, resetToTalentCodex }
}
