import { useState } from 'react'

import { createCx } from '@/shared/utils/classnames'
import Header from '@/shared/components/Header'
import { useNavigation } from '@/shared/hooks/useNavigation'
import Footer from '@/shared/components/Footer'
import { DashImageUrl } from '@/shared/utils/imageUrls'
import { CharacterClass } from '@/shared/types/characterClass'

import { useInitialClassAndDifficulty } from './hooks/useInitialClassAndDifficulty'
import { useChartControlState } from './hooks/useChartControlState'
import { useUrlParams } from './hooks/useUrlParams'
import Chart from './components/Chart'
import ChartControls from './components/ChartControls'
import ClassButtons from './components/ClassButtons'
import SubclassButtons from './components/SubclassButtons'
import BlightbaneModal from './components/BlightbaneModal'
import styles from './index.module.scss'

const cx = createCx(styles)

function Speedruns(): JSX.Element {
  const { initialClass, initialDifficulty } = useInitialClassAndDifficulty()
  const [selectedClass, setSelectedClass] = useState<CharacterClass>(initialClass)
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | undefined>()
  const { resetToSpeedruns } = useNavigation()

  const controls = useChartControlState(selectedClass, initialDifficulty)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handlePlayerClick = (player: string, timestamp: number) => {
    setSelectedPlayer(player)
    setSelectedTimestamp(timestamp)
    setIsModalOpen(true)
  }
  const isSunforge = selectedClass === CharacterClass.Sunforge

  const openInBlightbane = () => {
    window.open(`https://blightbane.io/deck/${selectedTimestamp}`, '_blank')
    setIsModalOpen(false)
  }

  useUrlParams(selectedClass, setSelectedClass, controls)

  return (
    <div className={cx('container')}>
      <Header
        onLogoClick={() => resetToSpeedruns(selectedClass, controls.difficulty)}
        logoSrc={DashImageUrl}
        title="Dawn-Dash"
        subtitle="Dawncaster speedrun charts"
        currentPage="speedruns"
      />

      <div className={cx('content')}>
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

export default Speedruns
