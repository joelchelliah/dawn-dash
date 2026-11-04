import { createCx } from '@/shared/utils/classnames'
import { DexImageUrl, HolyImageUrl, IntImageUrl, StrImageUrl } from '@/shared/utils/imageUrls'
import Image from '@/shared/components/Image'

import { TransmuteEnergyAttribute } from '@/transmute/types/rules'

import styles from './index.module.scss'

const cx = createCx(styles)

const ICONS: Record<TransmuteEnergyAttribute, { src: string; alt: string }> = {
  dex: { src: DexImageUrl, alt: 'Dexterity' },
  int: { src: IntImageUrl, alt: 'Intelligence' },
  str: { src: StrImageUrl, alt: 'Strength' },
  holy: { src: HolyImageUrl, alt: 'Holy' },
}

const ICON_SIZE = 18

const EnergyAttributeIconsInline = ({ attributes }: { attributes: TransmuteEnergyAttribute[] }) => (
  <span className={cx('energy-attribute-icons')}>
    {attributes.map((attribute) => (
      <Image
        key={attribute}
        src={ICONS[attribute].src}
        alt={ICONS[attribute].alt}
        width={ICON_SIZE}
        height={ICON_SIZE}
        className={cx('energy-attribute-icons__icon')}
      />
    ))}
  </span>
)

export default EnergyAttributeIconsInline
