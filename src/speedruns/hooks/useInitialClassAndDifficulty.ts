import { useRouter } from 'next/router'

import {
  DIFFICULTY_DEFAULT,
  CLASS_DEFAULT,
  DIFFICULTY_VALUES,
} from '../constants/chartControlValues'
import { Difficulty, SpeedRunClass } from '../types/speedRun'

// Using initial class and difficulty from the URL params (if available)
// to prevent unwated intitial fetch based on default values
export function useInitialClassAndDifficulty() {
  const router = useRouter()
  const classParam = router.query.class
  const initialClass = Object.values(SpeedRunClass).includes(classParam as SpeedRunClass)
    ? (classParam as SpeedRunClass)
    : CLASS_DEFAULT

  const difficultyParam = router.query.difficulty
  const initialDifficulty = DIFFICULTY_VALUES.includes(difficultyParam as Difficulty)
    ? (difficultyParam as Difficulty)
    : DIFFICULTY_DEFAULT

  return { initialClass, initialDifficulty }
}
