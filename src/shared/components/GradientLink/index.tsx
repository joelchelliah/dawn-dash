import styles from './index.module.scss'

interface GradientLinkProps {
  text: string
  url?: string
  onClick?: () => void
}

function GradientLink({ text, url, onClick }: GradientLinkProps): JSX.Element {
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={styles['link']}>
        {text}
      </a>
    )
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={styles['button-link']}>
        {text}
      </button>
    )
  }

  throw new Error('GradientLink must have an url or onClick prop')
}

export default GradientLink
