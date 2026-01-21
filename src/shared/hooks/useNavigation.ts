import { useRouter } from 'next/router'

export const useNavigation = () => {
  const router = useRouter()

  const resetToLandingPage = () => {
    router.replace('/')
  }

  const resetToSpeedruns = (selectedClass: string, difficulty: string) => {
    router.replace(`/speedruns?class=${selectedClass}&difficulty=${difficulty}`)
  }

  const resetToCardCodex = () => {
    router.replace('/cardex')
  }

  const resetToTalentCodex = () => {
    router.replace('/skilldex')
  }

  const resetToEventCodex = () => {
    router.replace('/eventmaps')
  }

  return {
    resetToLandingPage,
    resetToSpeedruns,
    resetToCardCodex,
    resetToTalentCodex,
    resetToEventCodex,
  }
}
