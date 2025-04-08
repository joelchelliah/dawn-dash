import styles from './index.module.scss'

interface GradientLinkProps {
  text: string
  url: string
}

function GradientLink({ text, url }: GradientLinkProps): JSX.Element {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={styles['link']}>
      {text}
    </a>
  )
}

export default GradientLink
