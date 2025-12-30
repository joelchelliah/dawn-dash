import { CharacterClass } from '@/shared/types/characterClass'

import {
  TalentTreeNodeType,
  TalentTreeTalentNode,
  HierarchicalTalentTreeNode,
} from '../types/talents'

import {
  getTalentRequirementIconProps,
  parseTalentDescriptionLineForDesktopRendering,
  parseTalentDescriptionLineForMobileRendering,
  wrapTextForTalents,
  getMatchingKeywordsText,
  matchesKeywordOrHasMatchingDescendant,
  getNodeInTree,
  isTalentOffer,
  isTalentInAnyEvents,
} from './talentHelper'

describe('talentHelper', () => {
  describe('getTalentRequirementIconProps', () => {
    describe('CLASS_REQUIREMENT', () => {
      it('should return correct props for all character classes', () => {
        const classes = [
          CharacterClass.Arcanist,
          CharacterClass.Hunter,
          CharacterClass.Knight,
          CharacterClass.Rogue,
          CharacterClass.Seeker,
          CharacterClass.Warrior,
          CharacterClass.Sunforge,
        ]

        classes.forEach((characterClass) => {
          const result = getTalentRequirementIconProps(true, characterClass)

          expect(result.count).toBe(1)
          expect(result.label).toBe(characterClass)
          expect(result.color).toBeDefined()
          expect(result.url).toBeDefined()
        })
      })
    })

    describe('ENERGY_REQUIREMENT', () => {
      it('should return correct props for single energy types', () => {
        const energyTypes = [
          { label: 'STR', expectedLabel: 'STR', count: 1 },
          { label: 'INT', expectedLabel: 'INT', count: 1 },
          { label: 'DEX', expectedLabel: 'DEX', count: 1 },
          { label: 'HOLY', expectedLabel: 'HOLY', count: 1 },
        ]

        energyTypes.forEach(({ label, expectedLabel, count }) => {
          const result = getTalentRequirementIconProps(false, label)

          expect(result.count).toBe(count)
          expect(result.label).toBe(expectedLabel)
          expect(result.color).toBeDefined()
          expect(result.url).toBeDefined()
        })
      })

      it('should return correct props for double energy types', () => {
        const energyTypes = [
          { label: 'STR2', expectedLabel: '2 STR', count: 2 },
          { label: 'INT2', expectedLabel: '2 INT', count: 2 },
          { label: 'DEX2', expectedLabel: '2 DEX', count: 2 },
        ]

        energyTypes.forEach(({ label, expectedLabel, count }) => {
          const result = getTalentRequirementIconProps(false, label)

          expect(result.count).toBe(count)
          expect(result.label).toBe(expectedLabel)
          expect(result.color).toBeDefined()
          expect(result.url).toBeDefined()
        })
      })

      it('should return correct props for triple energy types', () => {
        const energyTypes = [
          { label: 'STR3', expectedLabel: '3 STR', count: 3 },
          { label: 'INT3', expectedLabel: '3 INT', count: 3 },
          { label: 'DEX3', expectedLabel: '3 DEX', count: 3 },
        ]

        energyTypes.forEach(({ label, expectedLabel, count }) => {
          const result = getTalentRequirementIconProps(false, label)

          expect(result.count).toBe(count)
          expect(result.label).toBe(expectedLabel)
          expect(result.url).toBeDefined()
        })
      })
    })

    describe('SPECIAL_REQUIREMENTS', () => {
      it('should return correct props for Offers', () => {
        const result = getTalentRequirementIconProps(false, 'Offers')

        expect(result.count).toBe(1)
        expect(result.label).toBe('Offers')
        expect(result.url).toBeDefined()
        expect(result.color).toBeDefined()
      })

      it('should return correct props for Events', () => {
        const result = getTalentRequirementIconProps(false, 'Events')

        expect(result.count).toBe(1)
        expect(result.label).toBe('Obtained from events')
        expect(result.url).toBeDefined()
        expect(result.color).toBeDefined()
      })

      it('should return correct props for Cards', () => {
        const result = getTalentRequirementIconProps(false, 'Cards')

        expect(result.count).toBe(1)
        expect(result.label).toBe('Obtained from cards')
        expect(result.url).toBeDefined()
        expect(result.color).toBeDefined()
      })

      it('should return correct props for No Requirements', () => {
        const result = getTalentRequirementIconProps(false, 'No Requirements')

        expect(result.count).toBe(1)
        expect(result.label).toBe('No requirements')
        expect(result.url).toBeDefined()
        expect(result.color).toBeDefined()
      })

      it('should return correct props for specific card talents', () => {
        const cardTalents = ['Sacred Tome', 'Taurus Rage', 'Dark Revenance']

        cardTalents.forEach((cardName) => {
          const result = getTalentRequirementIconProps(false, cardName)

          expect(result.count).toBe(1)
          expect(result.label).toBe(cardName)
          expect(result.url).toBeDefined()
          expect(result.color).toBeDefined()
        })
      })

      it('should return default props for unknown event', () => {
        const result = getTalentRequirementIconProps(false, 'Some Unknown Event')

        expect(result.count).toBe(1)
        expect(result.label).toBe('Some Unknown Event')
        expect(result.url).toBeDefined()
        expect(result.color).toBeDefined()
      })
    })
  })

  describe('parseTalentDescriptionLineForDesktopRendering', () => {
    it('should normalize <br> tags', () => {
      const result = parseTalentDescriptionLineForDesktopRendering('Line 1<br>Line 2<br/>Line 3')

      const fullText = result.map((seg) => seg.content).join('')
      expect(fullText).toContain('<br />')
      expect(fullText).not.toContain('<br>')
    })

    it('should replace all bracket and parenthesis patterns correctly', () => {
      const testCases = [
        { input: '[[Bracketed]]', expected: '[Bracketed]' },
        { input: '([Test])', expected: '(Test)' },
        { input: '({Test})', expected: '(Test)' },
        { input: '[Test])', expected: '[Test)' },
        { input: '{Test})', expected: '{Test)' },
      ]

      testCases.forEach(({ input, expected }) => {
        const result = parseTalentDescriptionLineForDesktopRendering(input)
        expect(result[0].content).toBe(expected)
      })
    })

    it('should parse keywords into separate image segments', () => {
      const result = parseTalentDescriptionLineForDesktopRendering('Gain 5 HEALTH and 3 STR')

      expect(result).toHaveLength(4)
      expect(result[0]).toEqual({ type: 'text', content: 'Gain 5 ' })
      expect(result[1]).toEqual({ type: 'image', content: 'HEALTH', icon: expect.any(String) })
      expect(result[2]).toEqual({ type: 'text', content: ' and 3 ' })
      expect(result[3]).toEqual({ type: 'image', content: 'STR', icon: expect.any(String) })
    })

    it('should trim whitespace', () => {
      const result = parseTalentDescriptionLineForDesktopRendering('  Trimmed text  ')

      const firstText = result.find((seg) => seg.type === 'text')
      expect(firstText?.content).toBe('Trimmed text')
    })
  })

  describe('parseTalentDescriptionLineForMobileRendering', () => {
    it('should remove all HTML tags', () => {
      const testCases = [
        { input: 'Line 1<br>Line 2<br/>Line 3', expected: 'Line 1Line 2Line 3' },
        { input: '<b>Bold</b> <B>Text</B>', expected: 'Bold Text' },
        { input: '<nobr>No break</nobr>', expected: 'No break' },
      ]

      testCases.forEach(({ input, expected }) => {
        const result = parseTalentDescriptionLineForMobileRendering(input)
        expect(result).toBe(expected)
      })
    })

    it('should replace all bracket and parenthesis patterns correctly', () => {
      const testCases = [
        { input: '[[Bracketed]]', expected: '[Bracketed]' },
        { input: '([Test])', expected: '(Test)' },
        { input: '({Test})', expected: '(Test)' },
        { input: '[Test])', expected: '[Test)' },
        { input: '{Test})', expected: '{Test)' },
      ]

      testCases.forEach(({ input, expected }) => {
        const result = parseTalentDescriptionLineForMobileRendering(input)
        expect(result).toBe(expected)
      })
    })

    it('should replace all keyword types with correct emojis', () => {
      const testCases = [
        { keyword: 'HEALTH', emoji: '❤️' },
        { keyword: 'HOLY', emoji: '🟡' },
        { keyword: 'STR', emoji: '🔴' },
        { keyword: 'INT', emoji: '🔵' },
        { keyword: 'DEX', emoji: '🟢' },
        { keyword: 'NEUTRAL', emoji: '⚪' },
      ]

      testCases.forEach(({ keyword, emoji }) => {
        const result = parseTalentDescriptionLineForMobileRendering(`Test ${keyword} here`)
        expect(result).toContain(emoji)
      })
    })

    it('should remove (BLOOD) pattern', () => {
      const result = parseTalentDescriptionLineForMobileRendering('Damage (BLOOD) dealt')

      expect(result).not.toContain('(BLOOD)')
    })

    it('should trim whitespace', () => {
      const result = parseTalentDescriptionLineForMobileRendering('  Trimmed  ')

      expect(result).toBe('Trimmed')
    })

    it('should handle multiple replacements at once', () => {
      const result = parseTalentDescriptionLineForMobileRendering('<b>[[Bold]]</b> <br> HEALTH STR')

      expect(result).not.toContain('<b>')
      expect(result).not.toContain('[[')
      expect(result).toContain('❤️')
      expect(result).toContain('🔴')
    })
  })

  describe('wrapText', () => {
    it('should wrap at word boundaries', () => {
      const result = wrapTextForTalents('Word1 Word2 Word3 Word4 Word5', 60, 10)

      result.slice(1).forEach((line) => {
        expect(line.startsWith(' ')).toBe(false) // Lines shouldn't start with space
        expect(line.endsWith(' ')).toBe(false) // Lines shouldn't end with space
      })
    })

    it('should include empty first line for padding', () => {
      const result = wrapTextForTalents('Any text', 100, 10)

      expect(result[0]).toBe('')
    })
  })

  describe('getMatchingKeywordsText', () => {
    it('should return matching keywords in talent name', () => {
      const talent = mockHierarchicalTalent({
        name: 'Fire Blast',
        description: 'A powerful spell',
      })

      const result = getMatchingKeywordsText(talent, ['fire', 'water'])

      expect(result).toBe('{ fire }')
    })

    it('should return matching keywords in talent description', () => {
      const talent = mockHierarchicalTalent({
        name: 'Talent Name',
        description: 'Deals ice damage',
      })

      const result = getMatchingKeywordsText(talent, ['ice', 'fire'])

      expect(result).toBe('{ ice }')
    })

    it('should return multiple matching keywords', () => {
      const talent = mockHierarchicalTalent({
        name: 'Fire and Ice',
        description: 'Deals fire and ice damage',
      })

      const result = getMatchingKeywordsText(talent, ['fire', 'ice', 'water'])

      expect(result).toContain('fire')
      expect(result).toContain('ice')
      expect(result).not.toContain('water')
    })

    it('should be case insensitive', () => {
      const talent = mockHierarchicalTalent({
        name: 'FIRE BLAST',
        description: 'deals DAMAGE',
      })

      const result = getMatchingKeywordsText(talent, ['fire', 'damage'])

      expect(result).toContain('fire')
      expect(result).toContain('damage')
    })
  })

  describe('isTalentOffer', () => {
    it('should return true for valid offers', () => {
      const talent = mockTalentNode({
        name: 'Offer of Power',
        expansion: 0,
      })

      expect(isTalentOffer(talent)).toBe(true)
    })

    it('should return false for non-zero expansion', () => {
      const talent = mockTalentNode({
        name: 'Offer of Power',
        expansion: 1,
      })

      expect(isTalentOffer(talent)).toBe(false)
    })

    it('should return false for non-offer name with zero expansion', () => {
      const talent = mockTalentNode({
        name: 'Regular Talent',
        expansion: 0,
      })

      expect(isTalentOffer(talent)).toBe(false)
    })

    it('should return false for regular talents', () => {
      const talent = mockTalentNode({
        name: 'Regular Talent',
        expansion: 1,
      })

      expect(isTalentOffer(talent)).toBe(false)
    })
  })

  describe('isTalentInAnyEvents', () => {
    it('should return true when talent has events', () => {
      const talent = mockTalentNode({
        events: ['Event 1', 'Event 2'],
      })

      expect(isTalentInAnyEvents(talent)).toBe(true)
    })

    it('should return true when talent has single event', () => {
      const talent = mockTalentNode({
        events: ['Event 1'],
      })

      expect(isTalentInAnyEvents(talent)).toBe(true)
    })

    it('should return false when talent has no events', () => {
      const talent = mockTalentNode({
        events: [],
      })

      expect(isTalentInAnyEvents(talent)).toBe(false)
    })
  })

  describe('matchesKeywordOrHasMatchingDescendant', () => {
    it('should return true when node matches keyword', () => {
      const node = mockHierarchicalTalent({
        name: 'Fire Blast',
        description: 'A fire spell',
      })

      const result = matchesKeywordOrHasMatchingDescendant(node, ['fire'])

      expect(result).toBe(true)
    })

    it('should return true when deep descendant matches keyword', () => {
      const grandchild = mockHierarchicalTalent({
        name: 'Ice Grandchild',
        description: 'Ice damage',
      })
      const child = mockHierarchicalTalent({
        name: 'Child',
        description: 'No match',
        children: [grandchild],
      })
      const parent = mockHierarchicalTalent({
        name: 'Parent',
        description: 'No match',
        children: [child],
      })

      const result = matchesKeywordOrHasMatchingDescendant(parent, ['ice'])

      expect(result).toBe(true)
    })

    it('should return false when no matches found', () => {
      const child = mockHierarchicalTalent({
        name: 'Child',
        description: 'Other content',
      })
      const parent = mockHierarchicalTalent({
        name: 'Parent',
        description: 'No match',
        children: [child],
      })

      const result = matchesKeywordOrHasMatchingDescendant(parent, ['fire'])

      expect(result).toBe(false)
    })

    it('should return false when keywords array is empty', () => {
      const node = mockHierarchicalTalent({
        name: 'Fire Blast',
        description: 'Fire damage',
      })

      const result = matchesKeywordOrHasMatchingDescendant(node, [])

      expect(result).toBe(false)
    })
  })

  describe('getNodeInTree', () => {
    it('should find node at root level', () => {
      const root = mockHierarchicalTalent({
        name: 'Root',
        type: TalentTreeNodeType.TALENT,
      })

      const result = getNodeInTree('Root', TalentTreeNodeType.TALENT, root)

      expect(result).toBe(root)
    })

    it('should find node in deep hierarchy', () => {
      const grandchild = mockHierarchicalTalent({
        name: 'Grandchild',
        type: TalentTreeNodeType.TALENT,
      })
      const child = mockHierarchicalTalent({
        name: 'Child',
        type: TalentTreeNodeType.CLASS_REQUIREMENT,
        children: [grandchild],
      })
      const root = mockHierarchicalTalent({
        name: 'Root',
        type: TalentTreeNodeType.NO_REQUIREMENTS,
        children: [child],
      })

      const result = getNodeInTree('Grandchild', TalentTreeNodeType.TALENT, root)

      expect(result).toBe(grandchild)
    })

    it('should find node among multiple siblings', () => {
      const child1 = mockHierarchicalTalent({ name: 'Child1', type: TalentTreeNodeType.TALENT })
      const child2 = mockHierarchicalTalent({ name: 'Child2', type: TalentTreeNodeType.TALENT })
      const child3 = mockHierarchicalTalent({ name: 'Child3', type: TalentTreeNodeType.TALENT })
      const root = mockHierarchicalTalent({
        name: 'Root',
        type: TalentTreeNodeType.NO_REQUIREMENTS,
        children: [child1, child2, child3],
      })

      const result = getNodeInTree('Child2', TalentTreeNodeType.TALENT, root)

      expect(result).toBe(child2)
    })

    it('should return null when only name or only type matches', () => {
      const child1 = mockHierarchicalTalent({
        name: 'Child',
        type: TalentTreeNodeType.CLASS_REQUIREMENT,
      })
      const child2 = mockHierarchicalTalent({
        name: 'Other',
        type: TalentTreeNodeType.TALENT,
      })
      const root = mockHierarchicalTalent({
        name: 'Root',
        type: TalentTreeNodeType.NO_REQUIREMENTS,
        children: [child1, child2],
      })

      // Name matches but type does not
      const resultNameMatch = getNodeInTree('Child', TalentTreeNodeType.TALENT, root)
      expect(resultNameMatch).toBeNull()

      // Type matches but name does not
      const resultTypeMatch = getNodeInTree('NotFound', TalentTreeNodeType.TALENT, root)
      expect(resultTypeMatch).toBeNull()
    })

    it('should return null when node not found', () => {
      const child = mockHierarchicalTalent({ name: 'Child', type: TalentTreeNodeType.TALENT })
      const root = mockHierarchicalTalent({
        name: 'Root',
        type: TalentTreeNodeType.NO_REQUIREMENTS,
        children: [child],
      })

      const result = getNodeInTree('NotFound', TalentTreeNodeType.ENERGY_REQUIREMENT, root)

      expect(result).toBeNull()
    })

    it('should find node with matching name and type in complex tree', () => {
      const targetNode = mockHierarchicalTalent({
        name: 'Target',
        type: TalentTreeNodeType.ENERGY_REQUIREMENT,
      })
      const decoyNode = mockHierarchicalTalent({
        name: 'Target',
        type: TalentTreeNodeType.CLASS_REQUIREMENT,
      })
      const child = mockHierarchicalTalent({
        name: 'Child',
        type: TalentTreeNodeType.TALENT,
        children: [decoyNode, targetNode],
      })
      const root = mockHierarchicalTalent({
        name: 'Root',
        type: TalentTreeNodeType.NO_REQUIREMENTS,
        children: [child],
      })

      const result = getNodeInTree('Target', TalentTreeNodeType.ENERGY_REQUIREMENT, root)

      expect(result).toBe(targetNode)
      expect(result).not.toBe(decoyNode)
    })
  })
})

// Mock helper functions

function mockTalentNode(overrides: Partial<TalentTreeTalentNode> = {}): TalentTreeTalentNode {
  return {
    type: TalentTreeNodeType.TALENT,
    name: 'Mock Talent',
    description: 'Mock description',
    flavourText: 'Mock flavour',
    tier: 1,
    expansion: 1,
    events: [],
    children: [],
    descendants: [],
    classOrEnergyRequirements: [],
    talentRequirements: [],
    otherRequirements: [],
    ...overrides,
  }
}

function mockHierarchicalTalent(
  overrides: Partial<HierarchicalTalentTreeNode> = {}
): HierarchicalTalentTreeNode {
  return {
    type: TalentTreeNodeType.TALENT,
    name: 'Mock Talent',
    description: 'Mock description',
    flavourText: 'Mock flavour',
    classOrEnergyRequirements: [],
    talentRequirements: [],
    otherRequirements: [],
    ...overrides,
  } as HierarchicalTalentTreeNode
}
