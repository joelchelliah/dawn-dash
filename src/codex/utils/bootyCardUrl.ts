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
  rarity: string
  category: string
  type: string
  urlParam: string
}

export const BOOTY_CARD_URL_OWNER: BootyCardKind = 'treasure'

interface NamedCard {
  kind: BootyCardKind
  name: string
  rarity: string
  category: string
  type: string
}

const namedCards: NamedCard[] = [
  ...treasures.map(({ name, rarity, category, type }): NamedCard => ({
    kind: 'treasure',
    name,
    rarity,
    category,
    type,
  })),
  ...weapons.map(({ name, rarity, category, type }): NamedCard => ({
    kind: 'weapon',
    name,
    rarity,
    category,
    type,
  })),
]

const overlappingNames = new Set(
  namedCards
    .map(({ name }) => normalizeEventNameForUrl(name))
    .filter((param, index, params) => params.indexOf(param) !== index)
)

export const BOOTY_CARDS: BootyCard[] = namedCards.map((card) => ({
  ...card,
  urlParam: getBootyCardUrlParam(card.name, card.kind),
}))

export function findBootyCard(name: string, kind: BootyCardKind): BootyCard | null {
  return BOOTY_CARDS.find((card) => card.name === name && card.kind === kind) ?? null
}

export function findBootyCardByUrlParam(urlParam: string): BootyCard | null {
  const normalizedParam = urlParam.toLowerCase()

  return BOOTY_CARDS.find((card) => card.urlParam === normalizedParam) ?? null
}

export function getBootyCardUrlParams(): string[] {
  return BOOTY_CARDS.map((card) => card.urlParam)
}

export function getBootyCardUrlParam(name: string, kind: BootyCardKind): string {
  const baseParam = normalizeEventNameForUrl(name)
  const needsSuffix = overlappingNames.has(baseParam) && kind !== BOOTY_CARD_URL_OWNER

  return needsSuffix ? `${baseParam}_${kind}` : baseParam
}
