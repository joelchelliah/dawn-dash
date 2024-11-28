import './index.scss'

interface LoadingDotsProps {
  text?: string
}

function LoadingDots({ text }: LoadingDotsProps) {
  return (
    <div className="loading-dots-container">
      {text}{' '}
      <span className="loading-dots">
        <span>●</span>
        <span>●</span>
        <span>●</span>
      </span>
    </div>
  )
}

export default LoadingDots
