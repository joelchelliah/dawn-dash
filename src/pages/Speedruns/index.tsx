import { useState } from 'react'

import { useNavigate } from 'react-router-dom'

import Footer from '../../shared/components/Footer'
import { useInitialClassAndDifficulty } from '../../speedruns/hooks/useInitialClassAndDifficulty'
import BlightbaneModal from '../../speedruns/components/BlightbaneModal'
import Chart from '../../speedruns/components/Chart'
import ChartControls from '../../speedruns/components/ChartControls'
import ClassButtons from '../../speedruns/components/ClassButtons'
import HeaderInfo from '../../speedruns/components/HeaderInfo'
import SubclassButtons from '../../speedruns/components/SubclassButtons'
import { useChartControlState } from '../../speedruns/hooks/useChartControlState'
import { useUrlParams } from '../../speedruns/hooks/useUrlParams'
import { SpeedRunClass } from '../../speedruns/types/speedRun'

import styles from './index.module.scss'

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

      <Footer />

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
