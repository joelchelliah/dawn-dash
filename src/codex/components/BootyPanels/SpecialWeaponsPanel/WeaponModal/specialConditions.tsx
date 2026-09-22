import { CharacterClass } from '@/shared/types/characterClass'
import { BlightbaneMonsterUrl, EmpoweredHydraImageUrl } from '@/shared/utils/imageUrls'

import { SpecialConditionWeapon } from '@/codex/utils/weaponHelper'

import EnergyPip from '../../shared/EnergyPip'

import { Hl, SpecialCondition } from './conditionTypes'

const SPECIAL_CONDITIONS: Record<SpecialConditionWeapon, SpecialCondition> = {
  'Arcane Bow': {
    cards: ['Plain Bow', 'Stardart'],
    description: (
      <>
        Play a <Hl>Plain Bow</Hl> after having played at least <strong>10</strong>{' '}
        <Hl>Stardarts</Hl> during the same combat.
        <br />
        <br />
        Make sure to <strong>not</strong> meet the conditions for <Hl>Rainbow</Hl> at the same time.
      </>
    ),
  },
  Asteran: {
    events: ['Marrow Halls'],
    cards: ['Steel Longsword'],
    description: (
      <>
        Obtain the <Hl>Steel Longsword</Hl> from the <Hl>Marrow Halls</Hl> event.
        <br />
        <br />
        Spend <EnergyPip classType={CharacterClass.Sunforge} /> energy to play{' '}
        <Hl>Steel Longsword</Hl> <strong>9</strong> times during combat. Make sure to{' '}
        <strong>not</strong> be <strong>corrupted</strong>.
      </>
    ),
  },
  Astrakan: {
    customs: [
      { name: 'Asteran', bootyCard: 'weapon' },
      { name: 'Drakkan', bootyCard: 'weapon' },
    ],
    description: (
      <>
        Have at least one <Hl>Asteran</Hl> and one <Hl>Drakkan</Hl> in your deck at the same time.
        <br />
        <br />
        You will lose <strong>all copies</strong> of both weapons when you meet this condition.
      </>
    ),
  },
  Battlespear: {
    cards: ['Code of Steel', 'Divine Arsenal', 'Forged in Blood', 'Zealous Forging'],
    description: (
      <>
        There are several cards that add <strong>Untempered</strong> <Hl>Battlespears</Hl> to your
        deck.
        <br />
        <br />
        The only way to obtain a permanent copy is to remove the <strong>Untempered</strong>{' '}
        keyword, by making it <strong>Cursed</strong> during battle.
      </>
    ),
  },
  Blaster: {
    talents: ['Triage Weapon', 'Doing My Part'],
    cards: ['Sergeant'],
    description: (
      <>
        The <Hl>Triage Weapon</Hl> starter power gives you the <Hl>Doing My Part</Hl> talent, which
        rewards you for accumulated <strong>overkill</strong> damage.
        <br />
        <br />
        Passing <strong>499 overkill</strong> damage will promote you to <Hl>Sergeant</Hl>, and
        reward you with a <Hl>Blaster</Hl>.
      </>
    ),
  },
  Buzzsword: {
    talents: ['Triage Weapon', 'Doing My Part'],
    cards: ['Lieutenant'],
    description: (
      <>
        The <Hl>Triage Weapon</Hl> starter power gives you the <Hl>Doing My Part</Hl> talent, which
        rewards you for accumulated <strong>overkill</strong> damage.
        <br />
        <br />
        Passing <strong>999 overkill</strong> damage will promote you to <Hl>Lieutenant</Hl>, and
        reward you with a <Hl>Buzzsword</Hl>.
      </>
    ),
  },
  'Celestial Claws': {
    cards: ['Moonclaws', 'Ascension I', 'Ascension II', 'Ascension III'],
    description: (
      <>
        While <Hl>Ascended</Hl>, any <Hl>Moonclaws</Hl> drawn from your deck will{' '}
        <strong>temporarily</strong> transform into a <Hl>Celestial Claws</Hl>.
        <br />
        <br />
        <Hl>Moonclaws</Hl> always transform based on your latest form.
      </>
    ),
  },
  'Demon Claws': {
    cards: ['Moonclaws', 'Demonform I', 'Demonform II', 'Demonform III'],
    description: (
      <>
        While in <Hl>Demonform</Hl>, any <Hl>Moonclaws</Hl> drawn from your deck will{' '}
        <strong>temporarily</strong> transform into a <Hl>Demon Claws</Hl>.
        <br />
        <br />
        <Hl>Moonclaws</Hl> always transform based on your latest form.
      </>
    ),
  },
  Drakkan: {
    events: ['Marrow Halls'],
    cards: ['Steel Longsword'],
    description: (
      <>
        Obtain the <Hl>Steel Longsword</Hl> from the <Hl>Marrow Halls</Hl> event.
        <br />
        <br />
        Deal the killing blow <strong>9</strong> times with <Hl>Steel Longsword</Hl> during combat.
        Must be <strong>corrupted</strong>.
      </>
    ),
  },
  Halifax: {
    cards: ['Rusty Spear'],
    description: (
      <>
        Gain a total of <strong>150 Blessings</strong> while having a <Hl>Rusty Spear</Hl> in hand.
        <br />
        <br />
        <Hl>Rusty Spear</Hl>&apos;s <strong>Blessings</strong> count persists across multiple
        combats.
      </>
    ),
  },
  Helios: {
    customs: [
      {
        name: 'Empowered Hydra',
        kind: 'Monster',
        link: BlightbaneMonsterUrl('Empowered Hydra'),
        imageUrl: EmpoweredHydraImageUrl,
      },
      { name: 'Suntree Twig', bootyCard: 'weapon' },
    ],
    description: (
      <>
        Obtain the <Hl>Suntree Twig</Hl> from fighting the <Hl>Empowered Hydra</Hl>.
        <br />
        <br />
        <strong>Bury</strong> the <Hl>Suntree Twig</Hl>, on <strong>your</strong> turn, during any
        combat.
      </>
    ),
  },
  Majatome: {
    cards: ['Dull Axe'],
    description: (
      <>
        Trigger the <Hl>Dull Axe</Hl>
        &apos;s <strong>Rebound</strong> by playing it <strong>40</strong> times during combat.
      </>
    ),
  },
  Monolith: {
    cards: ['Stone Legends'],
    description: (
      <>
        Playing <Hl>Stone Legends</Hl> adds an <strong>Untempered</strong> <Hl>Monolith</Hl> to your
        deck.
        <br />
        <br />
        The only way to obtain a permanent copy is to remove the <strong>Untempered</strong>{' '}
        keyword, by making it <strong>Cursed</strong> during battle.
      </>
    ),
  },
  Oathbreaker: {
    events: ['Eastern Blightwoods Finish'],
    cards: ['Daggers'],
    description: (
      <>
        Have a <Hl>Daggers</Hl> in your deck when fighting the <strong>Eastern Blightwoods</strong>{' '}
        Bandit leader.
        <br />
        <br />
        Recruit the bandits to <strong>work for you</strong> in the{' '}
        <Hl>Eastern Blightwoods Finish</Hl> event.
      </>
    ),
  },
  Rainbow: {
    cards: ['Plain Bow'],
    description: (
      <>
        Play a <Hl>Plain Bow</Hl> while having <EnergyPip classType={CharacterClass.Rogue} />{' '}
        <EnergyPip classType={CharacterClass.Arcanist} />{' '}
        <EnergyPip classType={CharacterClass.Warrior} />{' '}
        <EnergyPip classType={CharacterClass.Sunforge} /> energy left over.
      </>
    ),
  },
  Rhymebind: {
    cards: ['Broken Hilt'],
    description: (
      <>
        Deal damage with <Hl>Broken Hilt</Hl>, after having inflicted a total of{' '}
        <strong>100 Frozen</strong> while having <Hl>Broken Hilt</Hl> in hand.
        <br />
        <br />
        <Hl>Broken Hilt</Hl>&apos;s <strong>Frozen</strong> count persists across multiple combats.
      </>
    ),
  },
  Rovik: {
    cards: ['Dull Maul'],
    description: (
      <>
        Play <Hl>Dull Maul</Hl> while having scars, until you reach an accumulated count of{' '}
        <strong>20 Scars</strong>.
        <br />
        <br />
        <Hl>Dull Maul</Hl>&apos;s <strong>Scars</strong> count persists across multiple combats.
      </>
    ),
  },
  'Suntree Twig': {
    customs: [
      {
        name: 'Empowered Hydra',
        kind: 'Monster',
        link: BlightbaneMonsterUrl('Empowered Hydra'),
        imageUrl: EmpoweredHydraImageUrl,
      },
    ],
    description: (
      <>
        Defeat the <Hl>Empowered Hydra</Hl> in the <strong>Emberwyld Heights</strong>.
        <br />
        <br />
        The <Hl>Suntree Twig</Hl> appears as a <strong>card reward</strong> after combat.
      </>
    ),
  },
  Trancor: {
    cards: ['Dull Hammer'],
    description: (
      <>
        Trigger the <Hl>Dull Hammer</Hl>
        &apos;s <strong>Rebound</strong> by playing it <strong>30</strong> times during combat.
      </>
    ),
  },
}

export const getSpecialCondition = (name: string): SpecialCondition | undefined =>
  SPECIAL_CONDITIONS[name as SpecialConditionWeapon]
