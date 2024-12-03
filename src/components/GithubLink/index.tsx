import { GitHubIcon } from '../../utils/icons'
import './index.scss'

function GithubLink(): JSX.Element {
  return (
    <div className="github-container">
      <a
        href="https://github.com/joelchelliah/dawn-dash"
        target="_blank"
        rel="noopener noreferrer"
        className="github-link"
      >
        <GitHubIcon className="github-icon" />
        <div className="hover-text">
          <span>This is an open source project: </span>
          <span className="url">github.com/joelchelliah/dawn-dash</span>
        </div>
      </a>
    </div>
  )
}

export default GithubLink
