import treasureCardsData from '@/codex/data/treasure-cards.json'
import specialWeaponsData from '@/codex/data/special-weapons.json'
import { TreasureCard } from '@/codex/types/treasures'
import { SpecialWeapon } from '@/codex/types/weapons'
import { normalizeEventNameForUrl } from '@/codex/hooks/useEventUrlParam'

const treasures = treasureCardsData as TreasureCard[]
const weapons = specialWeaponsData as SpecialWeapon[]

export type BootyCardKind = 'treasure' | 'weapon'

export interface BootyCard {
  kind: BootyCardKind
  name: string
  description: string
  category: string
  type: string
}

export const BOOTY_CARD_URL_OWNER: BootyCardKind = 'treasure'

export const BOOTY_CARDS: BootyCard[] = [
  ...treasures.map(({ name, description, category, type }): BootyCard => ({
    kind: 'treasure',
    name,
    description,
    category,
    type,
  })),
  ...weapons.map(({ name, description, category, type }): BootyCard => ({
    kind: 'weapon',
    name,
    description,
    category,
    type,
  })),
]

export function findBootyCardByUrlParam(urlParam: string): BootyCard | null {
  const normalizedParam = urlParam.toLowerCase()

  return BOOTY_CARDS.find((card) => normalizeEventNameForUrl(card.name) === normalizedParam) ?? null
}

export function getBootyCardUrlParams(): string[] {
  return Array.from(new Set(BOOTY_CARDS.map((card) => normalizeEventNameForUrl(card.name))))
}
