import { ScoringMode } from '@/scoring/types'

import Highlight from '../Highlight'
import ScoringList from '../ScoringList'

const SCALING_PERCENTAGES = [50, 100, 200]

interface MalignancyScalingListProps {
  baseValue: number
}

function MalignancyScalingList({ baseValue }: MalignancyScalingListProps): JSX.Element {
  return (
    <ScoringList mode={ScoringMode.Blightbane}>
      {SCALING_PERCENTAGES.map((percent) => (
        <li key={percent}>
          <strong>+{percent}% :</strong>{' '}
          <Highlight mode={ScoringMode.Blightbane} strong>
            {Math.ceil(baseValue * (1 + percent / 100))}
          </Highlight>
        </li>
      ))}
    </ScoringList>
  )
}

export default MalignancyScalingList
