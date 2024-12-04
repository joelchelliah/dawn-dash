import './index.scss'

interface GradientLinkProps {
  text: string
  url: string
}

function GradientLink({ text, url }: GradientLinkProps): JSX.Element {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="gradient-link">
      {text}
    </a>
  )
}

export default GradientLink
