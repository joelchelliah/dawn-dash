import { createCx } from '../../utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface GradientLinkProps {
  text: string
  url?: string
  onClick?: () => void
  className?: string
  internal?: boolean
}

function GradientLink({ text, url, onClick, className, internal }: GradientLinkProps): JSX.Element {
  if (url) {
    const target = internal ? undefined : '_blank'
    const rel = internal ? undefined : 'noopener noreferrer'
    return (
      <a href={url} target={target} rel={rel} className={cx('link', className)}>
        {text}
      </a>
    )
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={cx('button-link', className)}>
        {text}
      </button>
    )
  }

  throw new Error('GradientLink must have an url or onClick prop')
}

export default GradientLink
