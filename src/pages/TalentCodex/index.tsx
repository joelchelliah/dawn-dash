import { EleganceImageUrl } from '../../shared/utils/imageUrls'
import Header from '../../shared/components/Header'
import { useNavigation } from '../../shared/hooks/useNavigation'

import styles from './index.module.scss'

function TalentCodex(): JSX.Element {
  const { resetToCardCodex } = useNavigation()

  return (
    <div className={styles['container']}>
      <Header
        onLogoClick={resetToCardCodex}
        logoSrc={EleganceImageUrl}
        title="Dawn-Dash : Skilldex"
        subtitle="Dawncaster talent search & filter"
        currentPage="skilldex"
      />

      <div className={styles['content']}>
        <h3>Work in progress...</h3>
      </div>
    </div>
  )
}

export default TalentCodex
