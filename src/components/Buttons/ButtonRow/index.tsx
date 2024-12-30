import styles from './index.module.scss'

interface ButtonRowProps {
  children: React.ReactNode
}

function ButtonRow({ children }: ButtonRowProps): JSX.Element {
  return <div className={styles['button-row']}>{children}</div>
}

export default ButtonRow
