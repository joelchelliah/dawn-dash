import { GitHubIcon } from '../../utils/icons'
import GradientLink from '../GradientLink'

import './index.scss'

function OpenSourceInfo(): JSX.Element {
  return (
    <div className="open-source-info-container">
      <div className="hover-text">
        <span>This is an open source project: </span>
        <GradientLink
          text="github.com/joelchelliah/dawn-dash"
          url="https://github.com/joelchelliah/dawn-dash"
        />
      </div>
      <GitHubIcon className="github-icon" />
    </div>
  )
}

export default OpenSourceInfo
