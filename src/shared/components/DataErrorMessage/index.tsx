import styles from './index.module.scss'

type DataErrorMessageProps = {
  isVisible: boolean
  dataType: 'card' | 'talent'
}

const DataErrorMessage = ({ isVisible, dataType }: DataErrorMessageProps) => {
  if (!isVisible) return null

  return <div className={styles['error']}>💥 Error loading {dataType} data... Try again later!</div>
}

export default DataErrorMessage
