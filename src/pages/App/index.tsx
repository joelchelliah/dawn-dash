import { useState } from 'react'

import { useNavigate, useSearchParams } from 'react-router-dom'

import Chart from '../../components/Chart'
import ChartControls from '../../components/ChartControls'
import ClassButtons from '../../components/ClassButtons'
import GradientLink from '../../components/GradientLink'
import HeaderInfo from '../../components/HeaderInfo'
import BlightbaneModal from '../../components/Modals/BlightbaneModal'
import OpenSourceInfo from '../../components/OpenSourceInfo'
import SubclassButtons from '../../components/SubclassButtons'
import {
  DIFFICULTY_VALUES,
  DIFFICULTY_DEFAULT,
  CLASS_DEFAULT,
} from '../../constants/chartControlValues'
import { useChartControlState } from '../../hooks/useChartControlState'
import { useUrlParams } from '../../hooks/useUrlParams'
import { Difficulty, SpeedRunClass } from '../../types/speedRun'

import styles from './index.module.scss'

// Using initial class and difficulty from the URL params (if available)
// to prevent unwated intitial fetch based on default values
function useInitialClassAndDifficulty() {
  const [searchParams] = useSearchParams()
  const classParam = searchParams.get('class')
  const initialClass = Object.values(SpeedRunClass).includes(classParam as SpeedRunClass)
    ? (classParam as SpeedRunClass)
    : CLASS_DEFAULT

  const difficultyParam = searchParams.get('difficulty')
  const initialDifficulty = DIFFICULTY_VALUES.includes(difficultyParam as Difficulty)
    ? (difficultyParam as Difficulty)
    : DIFFICULTY_DEFAULT

  return { initialClass, initialDifficulty }
}

function App(): JSX.Element {
  const { initialClass, initialDifficulty } = useInitialClassAndDifficulty()
  const [selectedClass, setSelectedClass] = useState<SpeedRunClass>(initialClass)
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | undefined>()
  const navigate = useNavigate()

  const controls = useChartControlState(selectedClass, initialDifficulty)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const handlePlayerClick = (player: string, timestamp: number) => {
    setSelectedPlayer(player)
    setSelectedTimestamp(timestamp)
    setIsModalOpen(true)
  }
  const isSunforge = selectedClass === SpeedRunClass.Sunforge

  const openInBlightbane = () => {
    window.open(`https://blightbane.io/deck/${selectedTimestamp}`, '_blank')
    setIsModalOpen(false)
  }

  const resetToDefaults = () => {
    navigate(`/?class=${selectedClass}&difficulty=${controls.difficulty}`, { replace: true })
    window.location.reload()
  }

  useUrlParams(selectedClass, setSelectedClass, controls)

  return (
    <div className={styles['container']}>
      <div className={styles['header']}>
        <div className={styles['logo-and-title']} onClick={resetToDefaults}>
          <img
            src="https://blightbane.io/images/icons/cardart_4_53.webp"
            alt="Dawncaster Logo"
            className={styles['logo']}
          />
          <div>
            <h1 className={styles['title']}>Dawn-Dash</h1>
            <h2 className={styles['subtitle']}>Dawncaster speedrun charts</h2>
          </div>
        </div>
        <HeaderInfo />
      </div>

      <div className={styles['content']}>
        <ClassButtons onClassSelect={setSelectedClass} selectedClass={selectedClass} />
        {isSunforge && controls.subclass && (
          <SubclassButtons
            onSubclassSelect={controls.setSubclass}
            selectedSubclass={controls.subclass}
          />
        )}
        <ChartControls controls={controls} selectedClass={selectedClass} />
        <Chart
          controls={controls}
          selectedClass={selectedClass}
          onPlayerClick={handlePlayerClick}
        />
      </div>

      <footer className={styles['footer']}>
        <div className={styles['credits']}>
          Artwork and game data ©{' '}
          <GradientLink text="Dawncaster" url="https://dawncaster.wanderlost.games/" /> the game,{' '}
          <GradientLink text="Wanderlost" url="https://wanderlost.games/" />, and{' '}
          <GradientLink text="Blightbane" url="https://blightbane.io/" />
        </div>
        <OpenSourceInfo />
      </footer>

      <BlightbaneModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={openInBlightbane}
        player={selectedPlayer}
        playerClass={selectedClass}
        subclass={controls.subclass}
      />
    </div>
  )
}

export default App
