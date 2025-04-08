import GradientLink from '../GradientLink'

import OpenSourceInfo from './OpenSourceInfo'
import styles from './index.module.scss'

const Footer = () => {
  return (
    <footer className={styles['footer']}>
      <div className={styles['credits']}>
        Artwork and game data ©{' '}
        <GradientLink text="Dawncaster" url="https://dawncaster.wanderlost.games/" /> the game,{' '}
        <GradientLink text="Wanderlost" url="https://wanderlost.games/" />, and{' '}
        <GradientLink text="Blightbane" url="https://blightbane.io/" />
      </div>
      <OpenSourceInfo />
    </footer>
  )
}

export default Footer
