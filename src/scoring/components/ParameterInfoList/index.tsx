import { createCx } from '@/shared/utils/classnames'

import { ScoringMode } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

export interface Parameter {
  label: React.ReactNode
  emoji: string
  description: React.ReactNode
}

interface ParameterInfoListProps {
  parameters: Parameter[]
  mode?: ScoringMode
  className?: string
  fluidLabels?: boolean
  bordered?: boolean
}

function ParameterInfoList({
  parameters,
  mode,
  className,
  fluidLabels,
  bordered,
}: ParameterInfoListProps): JSX.Element {
  return (
    <ul
      className={cx('parameter-list', `parameter-list--${mode}`, className, {
        'parameter-list--bordered': bordered,
      })}
    >
      {parameters.map(({ label, emoji, description }, index) => (
        <li key={`${label}-${index}`}>
          <span className={cx('label', { 'label--fluid': fluidLabels })}>
            {emoji} {label}
          </span>{' '}
          <span className={cx('description')}>{description}</span>
        </li>
      ))}
    </ul>
  )
}

export default ParameterInfoList
