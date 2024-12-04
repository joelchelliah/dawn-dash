import { useState } from 'react'

import './App.scss'

import ButtonRow from './components/ButtonRow'
import Chart from './components/Chart'
import ChartControls from './components/ChartControls'
import GithubLink from './components/GithubLink'
import { useChartControlState } from './hooks/useChartControlState'
import { useUrlParams } from './hooks/useUrlParams'
import { SpeedRunClass } from './types/speedRun'

function App(): JSX.Element {
  const [selectedClass, setSelectedClass] = useState<SpeedRunClass>(SpeedRunClass.Arcanist)
  const controls = useChartControlState(selectedClass)

  useUrlParams(selectedClass, controls)

  return (
    <div className="App">
      <div className="header">
        <img
          src="https://blightbane.io/images/icons/cardart_4_53.webp"
          alt="Dawncaster Logo"
          className="app-logo"
        />
        <div className="title-container">
          <h1 className="app-title">Dawn-Dash</h1>
          <h2 className="app-subtitle">Dawncaster speedrun charts</h2>
        </div>
      </div>

      <div className="content">
        <ButtonRow onClassSelect={setSelectedClass} selectedClass={selectedClass} />
        <ChartControls controls={controls} selectedClass={selectedClass} />
        <Chart controls={controls} selectedClass={selectedClass} />
      </div>

      <footer className="footer">
        <div className="footer-credits">
          Artwork and game data ©{' '}
          <a
            href="https://dawncaster.wanderlost.games/"
            target="_blank"
            rel="noopener noreferrer"
            className="gradient-link"
          >
            Dawncaster
          </a>{' '}
          the game,{' '}
          <a
            href="https://wanderlost.games/"
            target="_blank"
            rel="noopener noreferrer"
            className="gradient-link"
          >
            Wanderlost
          </a>
          , and{' '}
          <a
            href="https://blightbane.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="gradient-link"
          >
            Blightbane
          </a>
        </div>
        <GithubLink />
      </footer>
    </div>
  )
}

export default App
