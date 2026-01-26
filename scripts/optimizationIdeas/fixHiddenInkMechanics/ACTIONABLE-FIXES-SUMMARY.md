# Actionable Fixes for Hidden Ink Mechanics

**Generated**: 2026-01-25
**Based on**: Complete analysis of all 182 events in events.json

## Executive Summary

Analysis of the compiled Ink JSON found **34 events** with the same structural issue as "Frozen Heart":
- They have knots defined **after the DONE statement** in the Ink root array
- These knots are **NOT explored** by the standard parser
- They are only accessible via **external game triggers** (like puzzle completion callbacks)
- Without special handling, entire branches of these events are missing from the tree

## CRITICAL: 34 Events Need Fixes

The following events require the same fix pattern used for Frozen Heart in event-alterations.js:

### Pattern: Force Explore Hidden Knots

For each event, add an entry to `event-alterations.js` that forces exploration of all knots defined after DONE:

```javascript
'Event Name': (event) => {
  // Add forced diverts to knots after DONE
  event.initialText += '\n-> knot_name_1\n-> knot_name_2\n-> knot_name_3'
  return event
}
```

## Complete List of 34 Events

### 1. Collector (10 knots)
**Knots**: Drakkan, Asteran, GoldenIdol, Legendary, Corruption, Common, Uncommon, Monster, Rare, Epic

These are callbacks for when player hands over different card types.

---

### 2. Enchanter 1 (2 knots)
**Knots**: changeCost, global decl

---

### 3. Illusionist (1 knot)
**Knots**: global decl

---

### 4. Priest (1 knot)
**Knots**: global decl

---

### 5. Priest 1 (1 knot)
**Knots**: global decl

---

### 6. Succubus 1 (1 knot)
**Knots**: global decl

---

### 7. The Ferryman (12 knots)
**Knots**: FerrymanApproach, FerrymanIdentity, PlaceDescription, OtherSideExplanation, CoinsExplanation, TollExplanation, CoinsNeeded, playerOffersCoins, AskForPassage, SuccessfulCrossing, FerrymanBoatRide, DescendIntoDarkness

Large narrative event with many sub-paths.

---

### 8. ACallForHelp (1 knot)
**Knots**: global decl

---

### 9. Amnesiac (1 knot)
**Knots**: global decl

---

### 10. BrightGem (1 knot)
**Knots**: global decl

---

### 11. Heated Debate (1 knot)
**Knots**: global decl

---

### 12. Hollow Tree (1 knot)
**Knots**: global decl

---

### 13. Prayer (1 knot)
**Knots**: global decl

---

### 14. TheCardGame (2 knots)
**Knots**: random, global decl

---

### 15. Ancient Tree (1 knot)
**Knots**: hint_of_danger

---

### 16. Earthy Crater (6 knots)
**Knots**: approach_crater, inspect_ground, look_around, consider_descending, descend_illuminated_side, descend_shadowy_side

---

### 17. Fancy Grave (1 knot)
**Knots**: global decl

---

### 18. Frozen Heart (7 knots) ✅ ALREADY FIXED
**Knots**: puzzlesuccess, puzzlefail, open_chest, left, right, exit, meeting

---

### 19. Shard of Mirrors (7 knots)
**Knots**: KNOT_PICK_STORIES, KNOT_BRANCH_WAITING, KNOT_END_STORY, func_offer_answer, func_note_answer, func_came_from, global decl

---

### 20. Talking Tree (1 knot)
**Knots**: global decl

---

### 21. The Suntree (7 knots)
**Knots**: approach_mage, ask_tree, introduce_self, bolgar_conversation, prepare_for_threat, ask_bolgar, hydra_appears

---

### 22. Brightcandle Inn (1 knot)
**Knots**: global decl

---

### 23. Dawnbringer Ystel (7 knots)
**Knots**: YstelStatueApproach, Destroy, ExamineStatue, InscriptionSearch, TouchSword, ReflectOnLegacy, MutterPrayer

---

### 24. Forking Tunnel (1 knot)
**Knots**: global decl

---

### 25. Lightmarshal Lucius (7 knots)
**Knots**: LuciousStatueApproach, Destroy, ExamineStatue, InscriptionSearch, TouchStatue, UtterPrayer, ReceiveWard

---

### 26. Mystical Glade (1 knot)
**Knots**: enter_glade

---

### 27. Overgrown Stone (9 knots)
**Knots**: approach_stone, examine_stone, look_around_clearing, ponder_battle, reflect_battle, search_clues, aftermath, take_fragment, leave_clearing

---

### 28. Rae (6 knots)
**Knots**: RaeStatueApproach, Destroy, ExamineStatue, InscriptionSearch, TouchStatue, ReflectOnRae

---

### 29. Shrine of Trickery (2 knots)
**Knots**: random, global decl

---

### 30. Abandoned Backpack (12 knots)
**Knots**: examine_backpack, observe, journal, locket, belongings, options, listen, communicate, take_leave, discard, leave_early, global decl

---

### 31. Damsel in Distress (5 knots)
**Knots**: suspect, holy_warning, help_woman, enthralled, confrontation

---

### 32. The Deal (14 knots)
**Knots**: explanation, grab, release_imp, take_bottle, banish, memory_deal, change, redpotion, greenpotion, bluepotion, endpotion, refuse, leave, global decl

---

### 33. The Dream (6 knots)
**Knots**: stars, depths, call, awaken, awakening, global decl

---

### 34. The Fracture (5 knots)
**Knots**: study_symbols, touch_tear, smash_orb, extract_orb, leave

---

## Implementation Strategy

### Option 1: Programmatic (Recommended)
Create a script that automatically adds forced diverts for all 34 events:

```javascript
// In event-alterations.js
const eventsWithHiddenKnots = {
  'Collector': ['Drakkan', 'Asteran', 'GoldenIdol', 'Legendary', 'Corruption', 'Common', 'Uncommon', 'Monster', 'Rare', 'Epic'],
  'Enchanter 1': ['changeCost', 'global decl'],
  // ... etc
}

Object.keys(eventsWithHiddenKnots).forEach(eventName => {
  alterations[eventName] = (event) => {
    const knots = eventsWithHiddenKnots[eventName]
    const diverts = knots
      .filter(k => k !== 'global decl') // Skip technical knots
      .map(k => `-> ${k}`)
      .join('\n')
    event.initialText += '\n' + diverts
    return event
  }
})
```

### Option 2: Manual
Add each event individually to event-alterations.js following the Frozen Heart pattern.

## Notes on "global decl" Knots

Many events have a `global decl` knot - this appears to be Ink's compiled representation of global variable declarations. These may not need forced exploration as they're code, not narrative content. Consider filtering these out or testing whether they affect the tree.

## Additional Findings

### Special Knots (8 events)
These events have knots with special names suggesting puzzle/challenge mechanics:
- GoldenIdol (fail)
- Frozen Heart (failure)
- Suspended Cage (puzzle, success)
- Serena Hellspark (defeatpriest)
- Hit a Mine DEXTERITY (failure, quitsuccess, quitfailure)
- Hit a Mine INTELLECT (failure, quitsuccess, quitfailure)
- Hit a Mine STRENGTH (failure, quitsuccess, quitfailure)
- Sunfall Meadows Finish (noreward, reward)

**Action**: Verify these knots are accessible in normal flow or add to forced exploration.

### Conditional Logic (59 events)
59 events use quest flags or talent checks to gate content. The current parser should already handle these by exploring all branches, but verify this is working correctly.

## Testing Strategy

After implementing fixes:

1. Run the tree parser on all 34 events
2. Compare node counts before/after
3. Look for new nodes that were previously missing
4. Verify all knot names appear in the generated tree
5. Check for any "orphaned" nodes (nodes with no incoming edges)

## Expected Impact

Based on Frozen Heart which added ~10 nodes from 7 hidden knots, estimate:
- **Collector**: +10-15 nodes (10 card type callbacks)
- **The Ferryman**: +15-20 nodes (12 narrative knots)
- **Abandoned Backpack**: +15-20 nodes (12 interactive knots)
- **The Deal**: +15-20 nodes (14 choice knots)
- **Large events**: +10-15 nodes each
- **Small events**: +1-3 nodes each

**Total estimated**: 150-250 new nodes across all 34 events

## Priority Order

1. **High Impact Events** (many knots):
   - The Deal (14 knots)
   - The Ferryman (12 knots)
   - Abandoned Backpack (12 knots)
   - Collector (10 knots)
   - Overgrown Stone (9 knots)

2. **Story-Critical Events** (narrative content):
   - The Suntree (7 knots)
   - Shard of Mirrors (7 knots)
   - Dawnbringer Ystel (7 knots)
   - Lightmarshal Lucius (7 knots)

3. **Low Impact** (mostly "global decl"):
   - All single-knot events with only "global decl"
