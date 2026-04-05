import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

export interface Parameter {
  label: string
  emoji: string
  description: React.ReactNode
}

interface ParameterInfoListProps {
  parameters: Parameter[]
}

function ParameterInfoList({ parameters }: ParameterInfoListProps): JSX.Element {
  return (
    <ul className={cx('parameter-list')}>
      {parameters.map(({ label, emoji, description }) => (
        <li key={label}>
          <span className={cx('label')}>
            {emoji} {label}:
          </span>{' '}
          <span className={cx('description')}>{description}</span>
        </li>
      ))}
    </ul>
  )
}

export default ParameterInfoList
