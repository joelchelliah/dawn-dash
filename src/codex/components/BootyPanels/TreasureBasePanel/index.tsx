import { createCx } from '@/shared/utils/classnames'

import PanelHeader, { PanelHeaderType } from '../../PanelHeader'

import styles from './index.module.scss'

const cx = createCx(styles)

interface TreasureBasePanelProps {
  type: Extract<PanelHeaderType, 'TreasureCards' | 'CardPools' | 'SpecialWeapons'>
  info?: React.ReactNode
  children: React.ReactNode
}

function TreasureBasePanel({ type, info, children }: TreasureBasePanelProps): JSX.Element {
  return (
    <div className={cx('treasure-panel')}>
      <div className={cx('treasure-panel__header')}>
        <PanelHeader type={type} />
      </div>

      <div className={cx('treasure-panel__container')}>
        {info && <div className={cx('treasure-panel__info')}>{info}</div>}
        {children}
      </div>
    </div>
  )
}

/* The panel owns its children's gutter, so a panel's content doesn't re-declare the margin. */
export function TreasurePanelRow({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className={cx('treasure-panel__row')}>{children}</div>
}

export function TreasurePanelMessage({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className={cx('treasure-panel__message')}>{children}</div>
}

export default TreasureBasePanel
