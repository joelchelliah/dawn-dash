import { createCx } from '../../utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface GradientLinkProps {
  text: string
  url?: string
  onClick?: () => void
  className?: string
}

function GradientLink({ text, url, onClick, className }: GradientLinkProps): JSX.Element {
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={cx('link', className)}>
        {text}
      </a>
    )
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={cx('button-link')}>
        {text}
      </button>
    )
  }

  throw new Error('GradientLink must have an url or onClick prop')
}

export default GradientLink
