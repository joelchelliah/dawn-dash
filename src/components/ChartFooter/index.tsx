import { useFromNow } from '../../hooks/useFromNow'
import { SpeedRunClass } from '../../types/speedRun'
import ClassEnergy from '../ClassEnergy'
import LoadingDots from '../LoadingDots'

import './index.scss'

interface ChartFooterProps {
  isLoading: boolean
  isLoadingInBackground: boolean
  lastUpdated: number | null
  selectedClass: SpeedRunClass
  refresh: () => void
}

function ChartFooter({
  isLoading,
  isLoadingInBackground,
  lastUpdated,
  selectedClass,
  refresh,
}: ChartFooterProps) {
  const fromNow = useFromNow(lastUpdated, 'Data from')

  const renderContent = () => {
    if (isLoading) return <LoadingDots text="" selectedClass={selectedClass} />
    if (isLoadingInBackground)
      return <LoadingDots text="Loading fresh data" selectedClass={selectedClass} />
    if (!fromNow) return null

    return (
      <>
        {fromNow}
        <button onClick={refresh} className="refresh-button">
          Refresh
        </button>
      </>
    )
  }

  return (
    <div className="chart-footer">
      <div className={`footer-energy left ${isLoading ? 'loading' : ''}`}>
        <ClassEnergy classType={selectedClass} />
      </div>
      <div className={`footer-content ${isLoadingInBackground ? 'loading' : ''}`}>
        {renderContent()}
      </div>
      <div className="footer-energy right">
        <ClassEnergy classType={selectedClass} />
      </div>
    </div>
  )
}

export default ChartFooter
