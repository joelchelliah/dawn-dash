import { EleganceImageUrl } from '../shared/utils/imageUrls'
import Header from '../shared/components/Header'
import { useNavigation } from '../shared/hooks/useNavigation'

import styles from './skills.module.scss'

function Skills(): JSX.Element {
  const { resetToCardCodex } = useNavigation()

  return (
    <div className={styles['container']}>
      <Header
        onLogoClick={resetToCardCodex}
        logoSrc={EleganceImageUrl}
        title="Dawn-Dash : Skilldex"
        subtitle="Dawncaster talents codex"
        currentPage="skilldex"
      />

      <div className={styles['content']}>
        <h3>Work in progress...</h3>
      </div>
    </div>
  )
}

export default Skills
