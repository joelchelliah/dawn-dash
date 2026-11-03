import { createCx } from '@/shared/utils/classnames'
import { DexImageUrl, HolyImageUrl, IntImageUrl, StrImageUrl } from '@/shared/utils/imageUrls'
import { allCardSetsWithoutCore } from '@/shared/hooks/useSearchFilters/useCardSetFilters'
import GradientButton from '@/shared/components/Buttons/GradientButton'
import ButtonRow from '@/shared/components/Buttons/ButtonRow'
import PanelHeader from '@/shared/components/PanelHeader'
import FilterGroup from '@/shared/components/FilterGroup'
import IconFilterLabel from '@/shared/components/FilterGroup/IconFilterLabel'
import Section from '@/shared/components/Section'

import { TransmuteMode } from '@/transmute/types/rules'
import {
  ALL_DIRECTIONS,
  ALL_MODES,
  EnergyAttributeFilterOption,
  TransmuteDirection,
} from '@/transmute/types/filters'
import { UseAllTransmuteSearchFilters } from '@/transmute/hooks/useSearchFilters/useAllTransmuteSearchFilters'
import { allEnergyAttributes } from '@/transmute/hooks/useSearchFilters/useEnergyAttributeFilters'
import { allFormattingTransmuteFilters } from '@/transmute/hooks/useSearchFilters/useFormattingTransmuteFilters'

import SegmentedControl from './SegmentedControl'
import styles from './index.module.scss'

const cx = createCx(styles)

const DIRECTION: Record<TransmuteDirection, string> = {
  from: 'Turns into',
  to: 'Comes from',
}

const DIRECTION_SUBTITLES: Record<TransmuteDirection, string> = {
  from: 'What this transforms into',
  to: 'What transforms into this',
}

const MODE_LABELS: Record<TransmuteMode, string> = {
  transmute: 'Transmute',
  sidemute: 'Sidemute',
  tradepost: 'Tradepost',
}

const MODE_SUBTITLES: Record<TransmuteMode, string> = {
  transmute: 'Same color, higher rarity',
  sidemute: 'Same color and rarity',
  tradepost: 'Same color and rarity',
}

const ENERGY_ATTRIBUTE_ICONS: Record<EnergyAttributeFilterOption, string> = {
  [EnergyAttributeFilterOption.Dexterity]: DexImageUrl,
  [EnergyAttributeFilterOption.Intelligence]: IntImageUrl,
  [EnergyAttributeFilterOption.Strength]: StrImageUrl,
  [EnergyAttributeFilterOption.Holy]: HolyImageUrl,
}

interface TransmuteSearchPanelProps {
  useSearchFilters: UseAllTransmuteSearchFilters
}

const TransmuteSearchPanel = ({ useSearchFilters }: TransmuteSearchPanelProps) => {
  const {
    direction,
    setDirection,
    mode,
    setMode,
    useCardSetFilters,
    useEnergyAttributeFilters,
    useFormattingFilters,
    resetFilters,
  } = useSearchFilters
  const { cardSetFilters, handleCardSetFilterToggle } = useCardSetFilters
  const {
    energyAttributeFilters,
    handleEnergyAttributeFilterToggle,
    getEnergyAttributeFilterName,
  } = useEnergyAttributeFilters
  const { formattingFilters, handleFormattingFilterToggle, getFormattingFilterName } =
    useFormattingFilters

  const showEnergyAttributes = mode === 'transmute'

  const getEnergyAttributeFilterLabel = (filter: string) => {
    if (!(filter in ENERGY_ATTRIBUTE_ICONS)) return filter

    const name = getEnergyAttributeFilterName(filter)

    return (
      <IconFilterLabel
        icon={ENERGY_ATTRIBUTE_ICONS[filter as EnergyAttributeFilterOption]}
        alt={`${name} icon`}
      >
        {name}
      </IconFilterLabel>
    )
  }

  const preventFormSubmission = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
  }

  return (
    <div className={cx('search-panel')}>
      <PanelHeader type="Search" />

      <form onSubmit={preventFormSubmission} aria-label="Transmute filters">
        <div className={cx('filters')}>
          <Section title="Mode">
            <SegmentedControl
              name="transmute-mode"
              ariaLabel="Mode"
              options={ALL_MODES}
              selected={mode}
              getLabel={(option) => MODE_LABELS[option]}
              getSubtitle={(option) => MODE_SUBTITLES[option]}
              onChange={setMode}
            />
          </Section>
          <Section title="Direction" spacing="medium">
            <SegmentedControl
              name="transmute-direction"
              ariaLabel="Direction"
              options={ALL_DIRECTIONS}
              selected={direction}
              getLabel={(option) => DIRECTION[option]}
              getSubtitle={(option) => DIRECTION_SUBTITLES[option]}
              onChange={setDirection}
            />
          </Section>
          <FilterGroup
            title="Card Sets"
            filters={allCardSetsWithoutCore}
            selectedFilters={cardSetFilters}
            type="card-set"
            onFilterToggle={handleCardSetFilterToggle}
          />
          {showEnergyAttributes ? (
            <FilterGroup
              title="Energy attributes"
              filters={allEnergyAttributes}
              selectedFilters={energyAttributeFilters}
              type="energy-attribute"
              onFilterToggle={handleEnergyAttributeFilterToggle}
              getFilterLabel={getEnergyAttributeFilterLabel}
            />
          ) : (
            <Section title="Energy attributes" spacing="medium">
              <p className={cx('filter-note')}>
                Your energy attributes only affect the Transmute mode.
              </p>
            </Section>
          )}
          <FilterGroup
            title="Results formatting"
            filters={allFormattingTransmuteFilters}
            selectedFilters={formattingFilters}
            type="formatting-transmute"
            onFilterToggle={handleFormattingFilterToggle}
            getFilterLabel={getFormattingFilterName}
          />
        </div>

        <ButtonRow align="left" includeBorder className={cx('button-row')}>
          <GradientButton
            subtle
            onClick={resetFilters}
            className={cx('filter-button')}
            showClickAnimation
          >
            Reset search
          </GradientButton>
        </ButtonRow>
      </form>
    </div>
  )
}

export default TransmuteSearchPanel
