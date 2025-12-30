import { useRouter } from 'next/router'

export const useNavigation = () => {
  const router = useRouter()

  const resetToSpeedruns = (selectedClass: string, difficulty: string) => {
    router.replace(`/?class=${selectedClass}&difficulty=${difficulty}`)
  }

  const resetToCardCodex = () => {
    router.replace('/codex/cards')
  }

  const resetToTalentCodex = () => {
    router.replace('/codex/skills')
  }

  const resetToEventCodex = () => {
    router.replace('/codex/events')
  }

  return { resetToSpeedruns, resetToCardCodex, resetToTalentCodex, resetToEventCodex }
}
