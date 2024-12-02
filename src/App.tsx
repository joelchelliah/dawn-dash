import { useState } from 'react'

import './App.scss'
import ButtonRow from './components/ButtonRow'
import Chart from './components/Chart'
import { SpeedRunClass } from './types/speedRun'

function App(): JSX.Element {
  const [selectedClass, setSelectedClass] = useState<SpeedRunClass>(SpeedRunClass.Arcanist)

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
      <ButtonRow onClassSelect={setSelectedClass} selectedClass={selectedClass} />
      <Chart selectedClass={selectedClass} />
      <footer className="footer">
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
        . This is an open source project. Check it out at{' '}
        <a
          href="https://github.com/joelchelliah/dawn-dash"
          target="_blank"
          rel="noopener noreferrer"
          className="gradient-link"
        >
          github.com/joelchelliah/dawn-dash
        </a>
      </footer>
    </div>
  )
}

export default App
