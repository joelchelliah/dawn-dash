import './App.scss'
import Chart from './components/Chart'

function App(): JSX.Element {
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
      <Chart />
    </div>
  )
}

export default App
