import Link from 'next/link'

import { createCx } from '../../utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface GradientLinkProps {
  text: string
  url?: string
  onClick?: () => void
  className?: string
  // Marks `url` as one of this site's own routes: it stays in the current tab and never reloads the page.
  internal?: boolean
}

function GradientLink({ text, url, onClick, className, internal }: GradientLinkProps): JSX.Element {
  if (url) {
    const linkClassName = cx('link', className)

    if (internal) {
      return (
        <Link href={url} className={linkClassName}>
          {text}
        </Link>
      )
    }

    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={linkClassName}>
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
