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
        <h1 className="app-title">Dawncaster Speedruns</h1>
      </div>
      <ButtonRow onClassSelect={setSelectedClass} selectedClass={selectedClass} />
      <Chart selectedClass={selectedClass} />
    </div>
  )
}

export default App
