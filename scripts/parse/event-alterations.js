/* eslint-disable */

/**
 * Event Alterations
 *
 * Manual fixes and enhancements for event trees that are difficult to parse automatically.
 * Applied AFTER all optimization passes (deduplication, refChildren conversion, etc.)
 *
 * SUPPORTED FIELDS:
 *
 * Finding nodes:
 * find: {options...}
 *   - { textOrLabel: 'text' } - Search by text or choiceLabel (substring match)
 *   - { textStartsWith: 'text' } - Search where text or choiceLabel starts with
 *   - { effect: 'CARDPUZZLE' } - Search by effect (substring match)
 *   - { requirement: 'COLLECTOR: Epic' } - Search by requirement (substring match)
 *   - { textOrLabel: 'text', effect: 'GOTOAREA: 91' } - Search by both text-or-label AND effect
 *   - { textOrLabel: 'text', requirement: 'strength:=0' } - Search by both text-or-label AND requirement
 *
 * Modifying nodes:
 * - addRequirements: Add requirements to matched nodes
 * - addChild: Add a new child node to matched nodes
 * - replaceNode: Replace the entire matched node with a new node structure
 * - replaceChildren: Replace matched node's children with new nodes (array of node specs).
 *   Use refChildrenFromFirstSibling: true on a child to set refChildren to first sibling's child ids.
 * - updateChild: Update properties of a node's single child (only if node has exactly 1 child).
 *   Supports: text, type, effects, numContinues, requirements, refCreate
 *   Skips nodes with 0 children, errors on nodes with >1 children.
 * - removeNode: true - Remove the matched node from the tree entirely
 * - modifyNode: Modify properties of matched nodes:
 *   - removeRef: true - Remove the ref field
 *   - removeText: true - Remove the text field
 *   - removeNumContinues: true - Remove the numContinues field
 *   - removeChildren: true - Remove the children field
 *   - type: 'end' - Change the node type
 *   - refCreate: 'text' - Create a ref to a node matching this text/choiceLabel
 *   - refCreateStartsWith: 'text' - Create a ref to first node whose text/choiceLabel starts with
 *
 * Creating refs within alterations (refTarget/refSource):
 * Since alterations run after all optimizations, node IDs are unpredictable.
 * Use refTarget/refSource to create circular refs within an alteration:
 * - refTarget: Marks a node as a ref target with a numeric ID (e.g., refTarget: 1)
 * - refSource: Will be converted to ref: <node_id> pointing to the refTarget node (e.g., refSource: 1)
 * - refCreate: Will be converted to ref: <node_id> pointing to the node that matches this text,
 *              in either text or choiceLabel, and has no ref of its own (it's the original node).
 *
 * Node structure fields:
 * - type: Node type ("dialogue", "choice", "combat", "end", "special")
 * - text: Node text content
 * - choiceLabel: Label for choice nodes
 * - requirements: Array of requirement strings
 * - effects: Array of effect strings (e.g., ["GOLD: 50", "ADDTALENT: Frozen Heart"])
 * - numContinues: Number of player clicks needed to advance
 * - children: Array of child nodes
 * - ref: Reference to another node by ID (use refSource and refCreate instead within alterations)
 */

const RANDOM_KEYWORD = '«random»'
const CARDGAME_CHOICE_LABELS = [
  'The Blood Moon',
  'The Final Star',
  'The Hangman',
  'The Hourglass',
  'The Pale Mask',
  'The Wheel',
]

/**
 * Helper to create event alterations that add death event transitions after combat nodes
 */
function createCombatTransition(eventName, combatTarget, gotoEvent) {
  return {
    name: eventName,
    alterations: [
      {
        find: { effect: `COMBAT: ${combatTarget}` },
        ...addGotoEventChild(gotoEvent),
      },
    ],
  }
}

function addGotoEventChild(gotoEvent) {
  return {
    addChild: {
      type: 'special',
      effects: [`GOTO EVENT: ${gotoEvent}`],
    },
  }
}

module.exports = [
  {
    name: 'Frozen Heart',
    alterations: [
      {
        find: { effect: 'CARDPUZZLE' },
        // Replace with a special node that has puzzle success/failure branches
        replaceNode: {
          type: 'special',
          text: '',
          numContinues: 0,
          effects: ['SELECTCARD', 'CARDPUZZLE'],
          children: [
            {
              type: 'result',
              requirements: ['puzzlesuccess'],
              children: [
                {
                  type: 'dialogue',
                  text: "Using one of your abilities, the ice fades quickly! Only the sizzling steam of the broken prison of ice now stands between you and the chest's contents. The chest pulses with a radiant heat, but is cool to the touch. In turn, the hum within the cavern rises to a deafening level.",
                  numContinues: 2,
                  refCreate: 'You smash at the ice repeatedly',
                },
              ],
            },
            {
              type: 'result',
              requirements: ['puzzlefail'],
              children: [
                {
                  type: 'dialogue',
                  text: 'Try as you might, you find no solution to breaking the ice around the strange chest. With no other option left, you descend the icy walls back to your starting point. At the bottom of the steps the chamber splits into two passageways.',
                  numContinues: 1,
                  // This will be converted to ref: <actual_node_id_of_matching_node>
                  refCreate: 'A rhythmic pulse fills the cave',
                },
              ],
            },
          ],
        },
      },
      {
        find: { effect: 'COMBAT: Maki Tagdahar' },
        ...addGotoEventChild('Maki Tagdahar Death'),
      },
      {
        find: { effect: 'COMBAT: Battleseer Hildune' },
        ...addGotoEventChild('Battleseer Hildune Death'),
      },
    ],
  },
  createCombatTransition('Abandoned Village', 'Kaius Tagdahar', 'Kaius Tagdahar Death'),
  createCombatTransition('The Chieftain', 'Gorn Tagdahar', 'Gorn Tagdahar Death'),
  createCombatTransition(
    'The Silent Reliquary Start',
    'Rathael the Slain',
    'Rathael the Slain Death'
  ),
  createCombatTransition('The Decayed Sanctum Start', 'AreaBoss', 'Queen of Decay Death'),
  createCombatTransition('The Eldritch Sanctum Start', 'AreaBoss', 'Outerworldly Entity Death'),
  createCombatTransition('The Defiled Sanctum Start', 'AreaBoss', 'Lord of Despair Death'),
  {
    name: 'The Defiled Sanctum',
    alterations: [
      {
        // Find the dialogue node that should be an end node (GOTOAREA transition)
        find: { effect: 'GOTOAREA: 91' },
        modifyNode: {
          removeRef: true,
          removeText: true,
          removeNumContinues: true,
          removeChildren: true,
          removeRefChildren: true,
          type: 'end',
        },
      },
    ],
  },
  {
    name: 'Rotting Residence',
    alterations: [
      {
        find: { textOrLabel: 'Investigate the large door' },
        addRequirements: ['NOT COMPLETED: Go Upstairs'],
      },
      {
        find: { textOrLabel: 'The hallway seems to have been part of a large residence' },
        addChild: {
          type: 'choice',
          choiceLabel: 'Investigate the large door',
          requirements: ['COMPLETED: Go Upstairs'],
          children: [
            {
              type: 'dialogue',
              text: "It doesn't budge. You notice a small keyhole on the door.",
              numContinues: 0,
              children: [
                {
                  type: 'choice',
                  choiceLabel: 'Unlock the door',
                  children: [
                    {
                      type: 'dialogue',
                      text: 'You slowly push open the door, as soon as you make a small opening, the air around you gets even worse. The Rot intensifies (+20 Rot).',
                      effects: ['AREASPECIAL: 20:Rot'],
                      numContinues: 1,
                      children: [
                        {
                          type: 'choice',
                          choiceLabel: 'Continue Pushing',
                          children: [
                            {
                              text: 'You fully open the door, revealing a small chamber. Inside you find a corpse next to a scrawled dark green circle covering the floor. You find a small treasure chest in the back.',
                              type: 'dialogue',
                              numContinues: 2,
                              effects: ['DELVEFROMANY: treasure', 'GOLD: 1', 'AREASPECIAL: 20:Rot'],
                              children: [
                                {
                                  type: 'choice',
                                  choiceLabel: 'Leave through the portal',
                                  children: [
                                    {
                                      text: 'As you leave, the portal closes behind you.',
                                      type: 'end',
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'choice',
                  choiceLabel: 'Leave',
                  children: [
                    {
                      text: 'You can distinguish several rooms that are still accessible and a large closed door is visible in the back of the hallway.',
                      type: 'dialogue',
                      numContinues: 0,
                      // This one points to a choice label in the original node. Not a text!
                      refCreate: 'Enter the portal',
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    name: 'Shrine of Trickery',
    alterations: [
      {
        find: { textOrLabel: 'The shrine allows you to alter a card' },
        modifyNode: {
          removeNumContinues: true,
          removeChildren: true,
          refCreate: 'A strange statue stands alone',
        },
      },
    ],
  },
  {
    name: 'The Cardgame',
    alterations: [
      {
        find: { textStartsWith: 'Three cards get dealt in front of you' },
        replaceChildren: [
          {
            type: 'special',
            text: RANDOM_KEYWORD,
            effects: [`random [${CARDGAME_CHOICE_LABELS.join(', ')}]`],
            children: [
              {
                type: 'result',
                requirements: ['The Blood Moon'],
                children: [
                  {
                    type: 'end',
                    text: 'The skeleton nods as it reveals the card, then smiles. "Action begets action - Fortune sees you are ready, stranger."',
                    effects: ['AREAEFFECT: The Blood Moon'],
                  },
                ],
              },
              {
                type: 'result',
                requirements: ['The Final Star'],
                children: [
                  {
                    type: 'end',
                    text: 'The skeleton solemnly turns over the card. "The Final Star, an omen of health, prosperity and fertility. Fortune smiles on you this day, stranger."',
                    effects: ['AREAEFFECT: The Final Star'],
                  },
                ],
              },
              {
                type: 'result',
                requirements: ['The Hangman'],
                children: [
                  {
                    type: 'dialogue',
                    text: 'The skeletal figure can barely contain its excitement, long yellow teeth clattering in its skull. As it lifts the card, skies darken above. "Foolishness or bravery, it matters not, you have earned our respect, stranger."',
                    effects: ['AREAEFFECT: The Hangman'],
                    numContinues: 1,
                    children: [
                      {
                        type: 'choice',
                        choiceLabel: 'Leave',
                        children: [
                          {
                            type: 'end',
                            effects: ["ADDTALENT: Trovan's Blessing"],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'result',
                requirements: ['The Hourglass'],
                children: [
                  {
                    type: 'end',
                    text: 'The skeleton folds its hands and grins widely, its two companions mirroring the action. "Fate seems impatient with you, stranger."',
                    effects: ['AREAEFFECT: The Hourglass'],
                  },
                ],
              },
              {
                type: 'result',
                requirements: ['The Pale Mask'],
                children: [
                  {
                    type: 'end',
                    text: 'The skeleton tilts its head, looking up at its two companions, then back at you, with a satisfied grin. "So be it; may the Pale Master find you soon, stranger."',
                    effects: ['AREAEFFECT: The Pale Mask'],
                  },
                ],
              },
              {
                type: 'result',
                requirements: ['The Wheel'],
                children: [
                  {
                    type: 'end',
                    text: 'The skeleton grins gleefully, then looks up at the sky. "Brave choice, wanderer. Let\'s see what the skies have in store for you."',
                    effects: ['AREAEFFECT: The Wheel'],
                  },
                ],
              },
            ],
          },
          {
            type: 'special',
            text: RANDOM_KEYWORD,
            effects: [`random [${CARDGAME_CHOICE_LABELS.join(', ')}]`],
            refChildrenFromFirstSibling: true,
          },
          {
            type: 'special',
            text: RANDOM_KEYWORD,
            effects: [`random [${CARDGAME_CHOICE_LABELS.join(', ')}]`],
            refChildrenFromFirstSibling: true,
          },
        ],
      },
      {
        find: { textOrLabel: 'the third skeletal figure croons with a cackle' },
        modifyNode: {
          removeNumContinues: true,
          removeChildren: true,
          refCreateStartsWith: 'Three cards get dealt in front of you',
        },
      },
    ],
  },
  // Forking Tunnel has 4 overlapping random ranges for gold, that we are not able to correctly map to the correct node
  // during the automatic parsing. This fix ensures that the correct nodes get the correct random range.
  {
    name: 'Forking Tunnel',
    alterations: [
      {
        find: { textOrLabel: 'Open the crypt vault' },
        updateChild: {
          effects: ['GOLD: random [30 - 65]'],
        },
      },
      {
        find: { requirement: 'strength:=0', textOrLabel: 'Break some gold free' },
        updateChild: {
          effects: ['GOLD: random [25 - 50]'],
        },
      },
      {
        find: { requirement: 'strength:=1', textOrLabel: 'Break some gold free' },
        updateChild: {
          effects: ['GOLD: random [50 - 75]'],
        },
      },
      {
        find: { requirement: 'strength:2', textOrLabel: 'Break some gold free' },
        updateChild: {
          effects: ['GOLD: random [75 - 125]'],
        },
      },
    ],
  },
  {
    name: 'Collector',
    alterations: [
      {
        find: { textStartsWith: '"It is very simple really' },
        modifyNode: {
          removeNumContinues: true,
          removeChildren: true,
          refCreateStartsWith: '"Ah, adventurer! You',
        },
      },
      // EPIC rarity doesn't exist in the game anymore
      {
        find: { requirement: 'COLLECTOR: Epic' },
        removeNode: true,
      },
      // g-0 (default) path will never occur in game
      {
        find: { requirement: 'COLLECTOR: g-0' },
        removeNode: true,
      },
    ],
  },
  {
    name: 'Succubus',
    alterations: [
      {
        find: { textOrLabel: 'I might have some puppets' },
        replaceChildren: [
          {
            type: 'dialogue',
            text: 'The demon smiles warmly as you approach, running a sharp-nailed finger along her chin. Found any more puppets for me, Champion?',
            numContinues: 0,
            children: [
              {
                type: 'choice',
                choiceLabel: '50 Souls: Imbue an Enchantment',
                requirements: ['souls: 50', 'enchantments: 1'],
                children: [
                  {
                    type: 'end',
                    effects: ['Souls: -50', 'ENCHANTERIMBUE'],
                  },
                ],
              },
              {
                type: 'choice',
                choiceLabel: 'Offer the Bandits',
                requirements: ['questflag: bandits'],
                children: [
                  {
                    type: 'end',
                    text: 'Oh yes! Where did you find this scruffy lot? You really know how to please a demon!',
                    effects: ['REMOVEQUESTFLAG: bandits', 'ADDTALENT: random'],
                  },
                ],
              },
              {
                type: 'choice',
                choiceLabel: 'Offer Julius',
                requirements: ['questflag: merchant'],
                children: [
                  {
                    type: 'dialogue',
                    text: 'We- We must protest! This is in clear violation of our Terms of Service! I-...!',
                    numContinues: 0,
                    children: [
                      {
                        type: 'end',
                        text: 'The succubus looks Julius over a for a moment, then reluctantly sighs and rolls her eyes. "Very well, I\'ll take him."',
                        effects: ['REMOVEQUESTFLAG: merchant', 'ADDTALENT: random'],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'choice',
                choiceLabel: 'Offer the Collector',
                requirements: ['questflag: collector'],
                children: [
                  {
                    type: 'dialogue',
                    text: 'Oh! Haha I suppose this will be a new experience. Of sorts. I uhm...',
                    numContinues: 0,
                    children: [
                      {
                        type: 'end',
                        text: 'The succubus leans forward and pulls on the old mans mustache, giggling as he whinces. "Deal!"',
                        effects: ['REMOVEQUESTFLAG: collector', 'ADDTALENT: random'],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'choice',
                choiceLabel: 'Return',
                refCreate: 'The demon smiles warmly as you approach',
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Obsidian Garden Finish',
    alterations: [
      {
        find: { effect: 'NEXTAREA' },
        modifyNode: {
          removeRef: true,
          removeNumContinues: true,
          removeText: true,
          removeChildren: true,
          type: 'end',
        },
      },
    ],
  },
]
