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
 *   - { textOrLabel: 'text' } - Search by text or choiceLabel
 *   - { effect: 'CARDPUZZLE' } - Search by effect (substring match)
 *   - { textOrLabel: 'text', effect: 'GOTOAREA: 91' } - Search by both text-or-label AND effect
 *
 * Modifying nodes:
 * - addRequirements: Add requirements to matched nodes
 * - addChild: Add a new child node to matched nodes
 * - replaceNode: Replace the entire matched node with a new node structure
 * - modifyNode: Modify properties of matched nodes:
 *   - removeRef: true - Remove the ref field
 *   - removeText: true - Remove the text field
 *   - removeNumContinues: true - Remove the numContinues field
 *   - type: 'end' - Change the node type
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
              type: 'choice',
              choiceLabel: 'default',
              requirements: ['PUZZLE SUCCESS'],
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
              type: 'choice',
              choiceLabel: 'default',
              requirements: ['PUZZLE FAILURE'],
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
    ],
  },
  {
    name: 'The Defiled Sanctum',
    alterations: [
      {
        // Find the dialogue node that should be an end node (GOTOAREA transition)
        find: { textOrLabel: 'The heads turn in unison before you speak', effect: 'GOTOAREA: 91' },
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
]
