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
          <h2 className="app-subtitle">Dawncaster speedruns</h2>
        </div>
      </div>
      <ButtonRow onClassSelect={setSelectedClass} selectedClass={selectedClass} />
      <Chart selectedClass={selectedClass} />
    </div>
  )
}

export default App
