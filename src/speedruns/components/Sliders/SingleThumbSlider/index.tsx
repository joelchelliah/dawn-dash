import { useNumberFormatter } from '@react-aria/i18n'
import { useSliderState } from '@react-stately/slider'

import { SpeedRunClass } from '../../../types/speedRun'
import Slider from '../Slider'

interface SingleThumbSliderProps {
  selectedValue: string
  values: string[]
  onChange: (value: string) => void
  onPointerDown: () => void
  ariaLabel: string
  isActive: boolean
  selectedClass: SpeedRunClass
}

function SingleThumbSlider({
  selectedValue,
  values,
  onChange,
  onPointerDown,
  ariaLabel,
  isActive,
  selectedClass,
}: SingleThumbSliderProps) {
  const state = useSliderState({
    numberFormatter: useNumberFormatter(),
    minValue: 0,
    maxValue: values.length - 1,
    step: 1,
    value: values.indexOf(selectedValue),
    onChange: (index) => onChange(values[index]),
  })

  return (
    <Slider
      state={state}
      values={values}
      onPointerDown={onPointerDown}
      ariaLabel={ariaLabel}
      isActive={isActive}
      selectedClass={selectedClass}
    />
  )
}

export default SingleThumbSlider
