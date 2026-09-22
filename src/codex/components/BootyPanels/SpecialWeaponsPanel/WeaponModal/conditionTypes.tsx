import { BootyCardKind } from '@/codex/utils/bootyCardUrl'

/*
 * A condition source that isn't a card, talent or event the generic lists already cover.
 */
export type CustomConditionSource =
  | { name: string; bootyCard: BootyCardKind; kind?: undefined }
  | { name: string; kind: string; link: string; imageUrl: string | null; bootyCard?: undefined }

export interface SpecialCondition {
  cards?: string[]
  talents?: string[]
  events?: string[]
  customs?: CustomConditionSource[]
  description: JSX.Element
}
