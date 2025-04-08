import { useNumberFormatter } from '@react-aria/i18n'
import { useSliderState } from '@react-stately/slider'

import { SpeedRunClass } from '../../../types/speedRun'
import Slider from '../Slider'

interface DoubleThumbSliderProps {
  selectedVal1: string
  selectedVal2: string
  values: string[]
  onChange: (val1: string, val2: string) => void
  onPointerDown: () => void
  ariaLabel: string
  isActive: boolean
  selectedClass: SpeedRunClass
}

function DoubleThumbSlider({
  ariaLabel,
  selectedVal1,
  selectedVal2,
  values,
  onChange,
  onPointerDown,
  isActive,
  selectedClass,
}: DoubleThumbSliderProps) {
  const state = useSliderState({
    numberFormatter: useNumberFormatter(),
    minValue: 0,
    maxValue: values.length - 1,
    step: 1,
    value: [values.indexOf(selectedVal1), values.indexOf(selectedVal2)],
    onChange: ([i1, i2]) => onChange(values[i1], values[i2]),
  })

  return (
    <Slider
      state={state}
      values={values}
      onPointerDown={onPointerDown}
      ariaLabel={ariaLabel}
      isActive={isActive}
      selectedClass={selectedClass}
      doubleThumbs
    />
  )
}

export default DoubleThumbSlider
