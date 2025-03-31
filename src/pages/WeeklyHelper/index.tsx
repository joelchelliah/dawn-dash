import React from 'react'

import styles from './index.module.scss'

function WeeklyHelper(): JSX.Element {
  return (
    <div className={styles.container}>
      <h1>Weekly Helper</h1>
      <p>This is a secret tool to help with weekly challenges.</p>
      {/* Add your weekly helper content here */}
    </div>
  )
}

export default WeeklyHelper
