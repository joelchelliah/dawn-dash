# Hidden Ink Mechanics Analysis

**Analysis Date**: 2026-01-25
**Total Events Analyzed**: 182
**Events with Potential Issues**: 83
**Clean Events**: 99

## Executive Summary

This analysis identifies Ink mechanics that may not be captured by standard tree parsing. The parser processes events linearly but some events have hidden branches only accessible through external game triggers (like puzzle completion callbacks).

### Issues by Type

- **Conditional Logic**: 65 occurrences
- **External Dependencies**: 34 occurrences
- **Special Knots**: 8 occurrences

## CRITICAL: Knots After DONE

**34 events** have knots defined after the main DONE statement. These knots are NOT explored by the standard parser and require special handling.

**This is the same pattern as Frozen Heart which was just fixed.**

### Collector
- 10 knot(s) after DONE: Drakkan, Asteran, GoldenIdol, Legendary, Corruption, Common, Uncommon, Monster, Rare, Epic
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: Drakkan, Asteran, GoldenIdol, Legendary, Corruption, Common, Uncommon, Monster, Rare, Epic

### Enchanter 1
- 2 knot(s) after DONE: changeCost, global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: changeCost, global decl

### Illusionist
- 1 knot(s) after DONE: global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: global decl

### Priest
- 1 knot(s) after DONE: global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: global decl

### Priest 1
- 1 knot(s) after DONE: global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: global decl

### Succubus 1
- 1 knot(s) after DONE: global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: global decl

### The Ferryman
- 12 knot(s) after DONE: FerrymanApproach, FerrymanIdentity, PlaceDescription, OtherSideExplanation, CoinsExplanation, TollExplanation, CoinsNeeded, playerOffersCoins, AskForPassage, SuccessfulCrossing, FerrymanBoatRide, DescendIntoDarkness
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: FerrymanApproach, FerrymanIdentity, PlaceDescription, OtherSideExplanation, CoinsExplanation, TollExplanation, CoinsNeeded, playerOffersCoins, AskForPassage, SuccessfulCrossing, FerrymanBoatRide, DescendIntoDarkness

### ACallForHelp
- 1 knot(s) after DONE: global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: global decl

### Amnesiac
- 1 knot(s) after DONE: global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: global decl

### BrightGem
- 1 knot(s) after DONE: global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: global decl

### Heated Debate
- 1 knot(s) after DONE: global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: global decl

### Hollow Tree
- 1 knot(s) after DONE: global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: global decl

### Prayer
- 1 knot(s) after DONE: global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: global decl

### TheCardGame
- 2 knot(s) after DONE: random, global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: random, global decl

### Ancient Tree
- 1 knot(s) after DONE: hint_of_danger
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: hint_of_danger

### Earthy Crater
- 6 knot(s) after DONE: approach_crater, inspect_ground, look_around, consider_descending, descend_illuminated_side, descend_shadowy_side
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: approach_crater, inspect_ground, look_around, consider_descending, descend_illuminated_side, descend_shadowy_side

### Fancy Grave
- 1 knot(s) after DONE: global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: global decl

### Frozen Heart
- 7 knot(s) after DONE: puzzlesuccess, puzzlefail, open_chest, left, right, exit, meeting
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: puzzlesuccess, puzzlefail, open_chest, left, right, exit, meeting

### Shard of Mirrors
- 7 knot(s) after DONE: KNOT_PICK_STORIES, KNOT_BRANCH_WAITING, KNOT_END_STORY, func_offer_answer, func_note_answer, func_came_from, global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: KNOT_PICK_STORIES, KNOT_BRANCH_WAITING, KNOT_END_STORY, func_offer_answer, func_note_answer, func_came_from, global decl

### Talking Tree
- 1 knot(s) after DONE: global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: global decl

### The Suntree
- 7 knot(s) after DONE: approach_mage, ask_tree, introduce_self, bolgar_conversation, prepare_for_threat, ask_bolgar, hydra_appears
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: approach_mage, ask_tree, introduce_self, bolgar_conversation, prepare_for_threat, ask_bolgar, hydra_appears

### Brightcandle Inn
- 1 knot(s) after DONE: global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: global decl

### Dawnbringer Ystel
- 7 knot(s) after DONE: YstelStatueApproach, Destroy, ExamineStatue, InscriptionSearch, TouchSword, ReflectOnLegacy, MutterPrayer
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: YstelStatueApproach, Destroy, ExamineStatue, InscriptionSearch, TouchSword, ReflectOnLegacy, MutterPrayer

### Forking Tunnel
- 1 knot(s) after DONE: global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: global decl

### Lightmarshal Lucius
- 7 knot(s) after DONE: LuciousStatueApproach, Destroy, ExamineStatue, InscriptionSearch, TouchStatue, UtterPrayer, ReceiveWard
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: LuciousStatueApproach, Destroy, ExamineStatue, InscriptionSearch, TouchStatue, UtterPrayer, ReceiveWard

### Mystical Glade
- 1 knot(s) after DONE: enter_glade
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: enter_glade

### Overgrown Stone
- 9 knot(s) after DONE: approach_stone, examine_stone, look_around_clearing, ponder_battle, reflect_battle, search_clues, aftermath, take_fragment, leave_clearing
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: approach_stone, examine_stone, look_around_clearing, ponder_battle, reflect_battle, search_clues, aftermath, take_fragment, leave_clearing

### Rae
- 6 knot(s) after DONE: RaeStatueApproach, Destroy, ExamineStatue, InscriptionSearch, TouchStatue, ReflectOnRae
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: RaeStatueApproach, Destroy, ExamineStatue, InscriptionSearch, TouchStatue, ReflectOnRae

### Shrine of Trickery
- 2 knot(s) after DONE: random, global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: random, global decl

### Abandoned Backpack
- 12 knot(s) after DONE: examine_backpack, observe, journal, locket, belongings, options, listen, communicate, take_leave, discard, leave_early, global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: examine_backpack, observe, journal, locket, belongings, options, listen, communicate, take_leave, discard, leave_early, global decl

### Damsel in Distress
- 5 knot(s) after DONE: suspect, holy_warning, help_woman, enthralled, confrontation
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: suspect, holy_warning, help_woman, enthralled, confrontation

### The Deal
- 14 knot(s) after DONE: explanation, grab, release_imp, take_bottle, banish, memory_deal, change, redpotion, greenpotion, bluepotion, endpotion, refuse, leave, global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: explanation, grab, release_imp, take_bottle, banish, memory_deal, change, redpotion, greenpotion, bluepotion, endpotion, refuse, leave, global decl

### The Dream
- 6 knot(s) after DONE: stars, depths, call, awaken, awakening, global decl
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: stars, depths, call, awaken, awakening, global decl

### The Fracture
- 5 knot(s) after DONE: study_symbols, touch_tear, smash_orb, extract_orb, leave
- **Impact**: Only accessible via external divert (game trigger)
- **Fix**: Add forced exploration in event-alterations.js: study_symbols, touch_tear, smash_orb, extract_orb, leave


## High Priority: Special Knots

**8 events** contain knots with special names (puzzle, success, fail, etc.). These may indicate challenge mechanics that require external triggers.

### GoldenIdol
- Contains special knots: fail
- **Fix**: Review accessibility of: fail

### Frozen Heart
- Contains special knots: failure
- **Fix**: Review accessibility of: failure

### Suspended Cage
- Contains special knots: puzzle, success
- **Fix**: Review accessibility of: puzzle, success

### Serena Hellspark
- Contains special knots: defeatpriest
- **Fix**: Review accessibility of: defeatpriest

### Hit a Mine DEXTERITY
- Contains special knots: failure, quitsuccess, quitfailure
- **Fix**: Review accessibility of: failure, quitsuccess, quitfailure

### Hit a Mine INTELLECT
- Contains special knots: failure, quitsuccess, quitfailure
- **Fix**: Review accessibility of: failure, quitsuccess, quitfailure

### Hit a Mine STRENGTH
- Contains special knots: failure, quitsuccess, quitfailure
- **Fix**: Review accessibility of: failure, quitsuccess, quitfailure

### Sunfall Meadows Finish
- Contains special knots: noreward, reward
- **Fix**: Review accessibility of: noreward, reward


## Medium Priority: Conditional Logic

**59 events** use quest flags or talent checks to gate content. The parser should explore all branches regardless of prerequisites.

<details>
<summary>Click to expand list of 59 events</summary>

**Alchemist**: Uses 1 quest flag(s): painting

**Alchemist 1**: Uses 1 quest flag(s): stormscarredintro; Uses 1 talent check(s): stormscarred

**Enchanter 1**: Uses 1 quest flag(s): noimbue

**Merchant**: Uses 1 quest flag(s): merchant

**Priest**: Uses 1 talent check(s): devotion

**Priest 1**: Uses 1 talent check(s): devotion

**Succubus 1**: Uses 3 quest flag(s): bandits, merchant, collector

**ArmsDealer**: Uses 1 talent check(s): devotion

**EmporiumCrates**: Uses 1 quest flag(s): merchant

**EntrancingSong**: Uses 1 talent check(s): Diamond

**FieldOfFlowers**: Uses 2 quest flag(s): enchanter, merchant

**GoldenIdol**: Uses 1 quest flag(s): collector; Uses 1 talent check(s): mobility

**LostSoul**: Uses 2 quest flag(s): priest, enchanter; Uses 1 talent check(s): devotion

**Prayer**: Uses 1 quest flag(s): priest

**SummoningCircle**: Uses 2 quest flag(s): enchanter, priest

**TheStew**: Uses 1 quest flag(s): priest

**WallOfFire**: Uses 1 talent check(s): Fire

**WindyHillock**: Uses 4 talent check(s): stormbringer, Grounding, Thundering, devotion

**Abandoned Village**: Uses 1 quest flag(s): huntress

**Candorian Priest**: Uses 1 quest flag(s): bandits

**Fallen Goliath**: Uses 1 quest flag(s): enchanter

**Frozen Heart**: Uses 2 quest flag(s): huntress, illusionist

**Glowing Runes**: Uses 2 quest flag(s): enchanter, merchant

**Heart of the Temple**: Uses 1 quest flag(s): priest

**Obsidian Statue**: Uses 2 quest flag(s): enchanter, alchemist

**Shard of Legends**: Uses 1 quest flag(s): priest

**Shard of Strife**: Uses 1 quest flag(s): priest

**Suspended Cage**: Uses 2 quest flag(s): correctrunes, alchemist

**The Voice Below**: Uses 1 quest flag(s): enchanter; Uses 1 talent check(s): watched

**Trail of Blood**: Uses 1 quest flag(s): huntress

**Chieftain Tagdahar**: Uses 2 quest flag(s): huntress, hildune

**Serena Hellspark**: Uses 3 quest flag(s): priest, ambercrystal, succubus

**Brightcandle Inn**: Uses 2 quest flag(s): illusionist, bounty

**Consul BanditQuestReward**: Uses 5 quest flag(s): druids, crimson, vesparin, merchant, soldiers

**Hit a Mine DEXTERITY**: Uses 1 quest flag(s): quit

**Hit a Mine INTELLECT**: Uses 1 quest flag(s): quit

**Hit a Mine STRENGTH**: Uses 1 quest flag(s): quit

**Lost Journal**: Uses 2 quest flag(s): priest, enchanter

**Spot in the Shade**: Uses 1 quest flag(s): quit

**Shrine of Binding**: Uses 1 talent check(s): skylars

**Shrine of Misery**: Uses 1 quest flag(s): enchanter

**Shrine of Trickery**: Uses 1 talent check(s): Faerytales

**Abandoned Backpack**: Uses 1 talent check(s): Diamond

**Battleseer Hildune Death**: Uses 1 quest flag(s): huntress

**Campfire**: Uses 1 quest flag(s): merchant; Uses 2 talent check(s): alchemist, Emporium

**Count Vesparin Death**: Uses 1 quest flag(s): bounty

**Damsel in Distress**: Uses 1 talent check(s): Diamond

**Gorn Tagdahar Death**: Uses 2 quest flag(s): hildune, huntress

**Kaius Tagdahar Death**: Uses 1 quest flag(s): kaius

**Rathael the Slain Death**: Uses 10 quest flag(s): rathael, blacksmith, alchemist, succubus, illusionist, merchant, dawnbringeralive, bandits, priest, collector

**Sanctum of Wrath Finish**: Uses 1 quest flag(s): rathaeldead

**Spine of Night Finish**: Uses 1 quest flag(s): spinedead

**Statue of Ilthar II Death**: Uses 2 quest flag(s): priest, alchemist

**Sunfall Meadows Finish**: Uses 1 quest flag(s): quit

**The Deep Finish**: Uses 1 talent check(s): watched

**The Defiled Sanctum Start**: Uses 2 quest flag(s): dawnbringerdead, dawnbringeralive

**The Godscar Wastes Finish**: Uses 1 talent check(s): Blessing

**The Godscar Wastes Start**: Uses 3 quest flag(s): enchanter, priest, alchemist; Uses 1 talent check(s): watched

**The Silent Reliquary Start**: Uses 1 quest flag(s): priest

</details>


## Game Triggers Reference

**0 events** use game triggers. These modify game state but shouldn't prevent exploration.

<details>
<summary>Click to expand list of 0 events</summary>

</details>


---

## Complete Event Index (Alphabetical)

### Abandoned Backpack

- **[External Dependencies]** 12 knot(s) after DONE: examine_backpack, observe, journal, locket, belongings, options, listen, communicate, take_leave, discard, leave_early, global decl
- **[Conditional Logic]** Uses 1 talent check(s): Diamond

### Abandoned Village

- **[Conditional Logic]** Uses 1 quest flag(s): huntress

### ACallForHelp

- **[External Dependencies]** 1 knot(s) after DONE: global decl

### Alchemist

- **[Conditional Logic]** Uses 1 quest flag(s): painting

### Alchemist 1

- **[Conditional Logic]** Uses 1 quest flag(s): stormscarredintro
- **[Conditional Logic]** Uses 1 talent check(s): stormscarred

### Amnesiac

- **[External Dependencies]** 1 knot(s) after DONE: global decl

### Ancient Tree

- **[External Dependencies]** 1 knot(s) after DONE: hint_of_danger

### ArmsDealer

- **[Conditional Logic]** Uses 1 talent check(s): devotion

### Battleseer Hildune Death

- **[Conditional Logic]** Uses 1 quest flag(s): huntress

### Brightcandle Inn

- **[External Dependencies]** 1 knot(s) after DONE: global decl
- **[Conditional Logic]** Uses 2 quest flag(s): illusionist, bounty

### BrightGem

- **[External Dependencies]** 1 knot(s) after DONE: global decl

### Campfire

- **[Conditional Logic]** Uses 1 quest flag(s): merchant
- **[Conditional Logic]** Uses 2 talent check(s): alchemist, Emporium

### Candorian Priest

- **[Conditional Logic]** Uses 1 quest flag(s): bandits

### Chieftain Tagdahar

- **[Conditional Logic]** Uses 2 quest flag(s): huntress, hildune

### Collector

- **[External Dependencies]** 10 knot(s) after DONE: Drakkan, Asteran, GoldenIdol, Legendary, Corruption, Common, Uncommon, Monster, Rare, Epic

### Consul BanditQuestReward

- **[Conditional Logic]** Uses 5 quest flag(s): druids, crimson, vesparin, merchant, soldiers

### Count Vesparin Death

- **[Conditional Logic]** Uses 1 quest flag(s): bounty

### Damsel in Distress

- **[External Dependencies]** 5 knot(s) after DONE: suspect, holy_warning, help_woman, enthralled, confrontation
- **[Conditional Logic]** Uses 1 talent check(s): Diamond

### Dawnbringer Ystel

- **[External Dependencies]** 7 knot(s) after DONE: YstelStatueApproach, Destroy, ExamineStatue, InscriptionSearch, TouchSword, ReflectOnLegacy, MutterPrayer

### Earthy Crater

- **[External Dependencies]** 6 knot(s) after DONE: approach_crater, inspect_ground, look_around, consider_descending, descend_illuminated_side, descend_shadowy_side

### EmporiumCrates

- **[Conditional Logic]** Uses 1 quest flag(s): merchant

### Enchanter 1

- **[External Dependencies]** 2 knot(s) after DONE: changeCost, global decl
- **[Conditional Logic]** Uses 1 quest flag(s): noimbue

### EntrancingSong

- **[Conditional Logic]** Uses 1 talent check(s): Diamond

### Fallen Goliath

- **[Conditional Logic]** Uses 1 quest flag(s): enchanter

### Fancy Grave

- **[External Dependencies]** 1 knot(s) after DONE: global decl

### FieldOfFlowers

- **[Conditional Logic]** Uses 2 quest flag(s): enchanter, merchant

### Forking Tunnel

- **[External Dependencies]** 1 knot(s) after DONE: global decl

### Frozen Heart

- **[External Dependencies]** 7 knot(s) after DONE: puzzlesuccess, puzzlefail, open_chest, left, right, exit, meeting
- **[Conditional Logic]** Uses 2 quest flag(s): huntress, illusionist
- **[Special Knots]** Contains special knots: failure

### Glowing Runes

- **[Conditional Logic]** Uses 2 quest flag(s): enchanter, merchant

### GoldenIdol

- **[Conditional Logic]** Uses 1 quest flag(s): collector
- **[Conditional Logic]** Uses 1 talent check(s): mobility
- **[Special Knots]** Contains special knots: fail

### Gorn Tagdahar Death

- **[Conditional Logic]** Uses 2 quest flag(s): hildune, huntress

### Heart of the Temple

- **[Conditional Logic]** Uses 1 quest flag(s): priest

### Heated Debate

- **[External Dependencies]** 1 knot(s) after DONE: global decl

### Hit a Mine DEXTERITY

- **[Conditional Logic]** Uses 1 quest flag(s): quit
- **[Special Knots]** Contains special knots: failure, quitsuccess, quitfailure

### Hit a Mine INTELLECT

- **[Conditional Logic]** Uses 1 quest flag(s): quit
- **[Special Knots]** Contains special knots: failure, quitsuccess, quitfailure

### Hit a Mine STRENGTH

- **[Conditional Logic]** Uses 1 quest flag(s): quit
- **[Special Knots]** Contains special knots: failure, quitsuccess, quitfailure

### Hollow Tree

- **[External Dependencies]** 1 knot(s) after DONE: global decl

### Illusionist

- **[External Dependencies]** 1 knot(s) after DONE: global decl

### Kaius Tagdahar Death

- **[Conditional Logic]** Uses 1 quest flag(s): kaius

### Lightmarshal Lucius

- **[External Dependencies]** 7 knot(s) after DONE: LuciousStatueApproach, Destroy, ExamineStatue, InscriptionSearch, TouchStatue, UtterPrayer, ReceiveWard

### Lost Journal

- **[Conditional Logic]** Uses 2 quest flag(s): priest, enchanter

### LostSoul

- **[Conditional Logic]** Uses 2 quest flag(s): priest, enchanter
- **[Conditional Logic]** Uses 1 talent check(s): devotion

### Merchant

- **[Conditional Logic]** Uses 1 quest flag(s): merchant

### Mystical Glade

- **[External Dependencies]** 1 knot(s) after DONE: enter_glade

### Obsidian Statue

- **[Conditional Logic]** Uses 2 quest flag(s): enchanter, alchemist

### Overgrown Stone

- **[External Dependencies]** 9 knot(s) after DONE: approach_stone, examine_stone, look_around_clearing, ponder_battle, reflect_battle, search_clues, aftermath, take_fragment, leave_clearing

### Prayer

- **[External Dependencies]** 1 knot(s) after DONE: global decl
- **[Conditional Logic]** Uses 1 quest flag(s): priest

### Priest

- **[External Dependencies]** 1 knot(s) after DONE: global decl
- **[Conditional Logic]** Uses 1 talent check(s): devotion

### Priest 1

- **[External Dependencies]** 1 knot(s) after DONE: global decl
- **[Conditional Logic]** Uses 1 talent check(s): devotion

### Rae

- **[External Dependencies]** 6 knot(s) after DONE: RaeStatueApproach, Destroy, ExamineStatue, InscriptionSearch, TouchStatue, ReflectOnRae

### Rathael the Slain Death

- **[Conditional Logic]** Uses 10 quest flag(s): rathael, blacksmith, alchemist, succubus, illusionist, merchant, dawnbringeralive, bandits, priest, collector

### Sanctum of Wrath Finish

- **[Conditional Logic]** Uses 1 quest flag(s): rathaeldead

### Serena Hellspark

- **[Conditional Logic]** Uses 3 quest flag(s): priest, ambercrystal, succubus
- **[Special Knots]** Contains special knots: defeatpriest

### Shard of Legends

- **[Conditional Logic]** Uses 1 quest flag(s): priest

### Shard of Mirrors

- **[External Dependencies]** 7 knot(s) after DONE: KNOT_PICK_STORIES, KNOT_BRANCH_WAITING, KNOT_END_STORY, func_offer_answer, func_note_answer, func_came_from, global decl

### Shard of Strife

- **[Conditional Logic]** Uses 1 quest flag(s): priest

### Shrine of Binding

- **[Conditional Logic]** Uses 1 talent check(s): skylars

### Shrine of Misery

- **[Conditional Logic]** Uses 1 quest flag(s): enchanter

### Shrine of Trickery

- **[External Dependencies]** 2 knot(s) after DONE: random, global decl
- **[Conditional Logic]** Uses 1 talent check(s): Faerytales

### Spine of Night Finish

- **[Conditional Logic]** Uses 1 quest flag(s): spinedead

### Spot in the Shade

- **[Conditional Logic]** Uses 1 quest flag(s): quit

### Statue of Ilthar II Death

- **[Conditional Logic]** Uses 2 quest flag(s): priest, alchemist

### Succubus 1

- **[External Dependencies]** 1 knot(s) after DONE: global decl
- **[Conditional Logic]** Uses 3 quest flag(s): bandits, merchant, collector

### SummoningCircle

- **[Conditional Logic]** Uses 2 quest flag(s): enchanter, priest

### Sunfall Meadows Finish

- **[Conditional Logic]** Uses 1 quest flag(s): quit
- **[Special Knots]** Contains special knots: noreward, reward

### Suspended Cage

- **[Conditional Logic]** Uses 2 quest flag(s): correctrunes, alchemist
- **[Special Knots]** Contains special knots: puzzle, success

### Talking Tree

- **[External Dependencies]** 1 knot(s) after DONE: global decl

### The Deal

- **[External Dependencies]** 14 knot(s) after DONE: explanation, grab, release_imp, take_bottle, banish, memory_deal, change, redpotion, greenpotion, bluepotion, endpotion, refuse, leave, global decl

### The Deep Finish

- **[Conditional Logic]** Uses 1 talent check(s): watched

### The Defiled Sanctum Start

- **[Conditional Logic]** Uses 2 quest flag(s): dawnbringerdead, dawnbringeralive

### The Dream

- **[External Dependencies]** 6 knot(s) after DONE: stars, depths, call, awaken, awakening, global decl

### The Ferryman

- **[External Dependencies]** 12 knot(s) after DONE: FerrymanApproach, FerrymanIdentity, PlaceDescription, OtherSideExplanation, CoinsExplanation, TollExplanation, CoinsNeeded, playerOffersCoins, AskForPassage, SuccessfulCrossing, FerrymanBoatRide, DescendIntoDarkness

### The Fracture

- **[External Dependencies]** 5 knot(s) after DONE: study_symbols, touch_tear, smash_orb, extract_orb, leave

### The Godscar Wastes Finish

- **[Conditional Logic]** Uses 1 talent check(s): Blessing

### The Godscar Wastes Start

- **[Conditional Logic]** Uses 3 quest flag(s): enchanter, priest, alchemist
- **[Conditional Logic]** Uses 1 talent check(s): watched

### The Silent Reliquary Start

- **[Conditional Logic]** Uses 1 quest flag(s): priest

### The Suntree

- **[External Dependencies]** 7 knot(s) after DONE: approach_mage, ask_tree, introduce_self, bolgar_conversation, prepare_for_threat, ask_bolgar, hydra_appears

### The Voice Below

- **[Conditional Logic]** Uses 1 quest flag(s): enchanter
- **[Conditional Logic]** Uses 1 talent check(s): watched

### TheCardGame

- **[External Dependencies]** 2 knot(s) after DONE: random, global decl

### TheStew

- **[Conditional Logic]** Uses 1 quest flag(s): priest

### Trail of Blood

- **[Conditional Logic]** Uses 1 quest flag(s): huntress

### WallOfFire

- **[Conditional Logic]** Uses 1 talent check(s): Fire

### WindyHillock

- **[Conditional Logic]** Uses 4 talent check(s): stormbringer, Grounding, Thundering, devotion


---

## Events Ranked by Issue Count

| # | Event Name | Issues | Types |
|---|------------|--------|-------|
| 1 | Frozen Heart | 3 | External Dependencies, Conditional Logic, Special Knots |
| 2 | GoldenIdol | 3 | Conditional Logic, Special Knots |
| 3 | Abandoned Backpack | 2 | External Dependencies, Conditional Logic |
| 4 | Alchemist 1 | 2 | Conditional Logic |
| 5 | Brightcandle Inn | 2 | External Dependencies, Conditional Logic |
| 6 | Campfire | 2 | Conditional Logic |
| 7 | Damsel in Distress | 2 | External Dependencies, Conditional Logic |
| 8 | Enchanter 1 | 2 | External Dependencies, Conditional Logic |
| 9 | Hit a Mine DEXTERITY | 2 | Conditional Logic, Special Knots |
| 10 | Hit a Mine INTELLECT | 2 | Conditional Logic, Special Knots |
| 11 | Hit a Mine STRENGTH | 2 | Conditional Logic, Special Knots |
| 12 | LostSoul | 2 | Conditional Logic |
| 13 | Prayer | 2 | External Dependencies, Conditional Logic |
| 14 | Priest | 2 | External Dependencies, Conditional Logic |
| 15 | Priest 1 | 2 | External Dependencies, Conditional Logic |
| 16 | Serena Hellspark | 2 | Conditional Logic, Special Knots |
| 17 | Shrine of Trickery | 2 | External Dependencies, Conditional Logic |
| 18 | Succubus 1 | 2 | External Dependencies, Conditional Logic |
| 19 | Sunfall Meadows Finish | 2 | Conditional Logic, Special Knots |
| 20 | Suspended Cage | 2 | Conditional Logic, Special Knots |
| 21 | The Godscar Wastes Start | 2 | Conditional Logic |
| 22 | The Voice Below | 2 | Conditional Logic |
| 23 | Abandoned Village | 1 | Conditional Logic |
| 24 | ACallForHelp | 1 | External Dependencies |
| 25 | Alchemist | 1 | Conditional Logic |
| 26 | Amnesiac | 1 | External Dependencies |
| 27 | Ancient Tree | 1 | External Dependencies |
| 28 | ArmsDealer | 1 | Conditional Logic |
| 29 | Battleseer Hildune Death | 1 | Conditional Logic |
| 30 | BrightGem | 1 | External Dependencies |
| 31 | Candorian Priest | 1 | Conditional Logic |
| 32 | Chieftain Tagdahar | 1 | Conditional Logic |
| 33 | Collector | 1 | External Dependencies |
| 34 | Consul BanditQuestReward | 1 | Conditional Logic |
| 35 | Count Vesparin Death | 1 | Conditional Logic |
| 36 | Dawnbringer Ystel | 1 | External Dependencies |
| 37 | Earthy Crater | 1 | External Dependencies |
| 38 | EmporiumCrates | 1 | Conditional Logic |
| 39 | EntrancingSong | 1 | Conditional Logic |
| 40 | Fallen Goliath | 1 | Conditional Logic |
| 41 | Fancy Grave | 1 | External Dependencies |
| 42 | FieldOfFlowers | 1 | Conditional Logic |
| 43 | Forking Tunnel | 1 | External Dependencies |
| 44 | Glowing Runes | 1 | Conditional Logic |
| 45 | Gorn Tagdahar Death | 1 | Conditional Logic |
| 46 | Heart of the Temple | 1 | Conditional Logic |
| 47 | Heated Debate | 1 | External Dependencies |
| 48 | Hollow Tree | 1 | External Dependencies |
| 49 | Illusionist | 1 | External Dependencies |
| 50 | Kaius Tagdahar Death | 1 | Conditional Logic |
| 51 | Lightmarshal Lucius | 1 | External Dependencies |
| 52 | Lost Journal | 1 | Conditional Logic |
| 53 | Merchant | 1 | Conditional Logic |
| 54 | Mystical Glade | 1 | External Dependencies |
| 55 | Obsidian Statue | 1 | Conditional Logic |
| 56 | Overgrown Stone | 1 | External Dependencies |
| 57 | Rae | 1 | External Dependencies |
| 58 | Rathael the Slain Death | 1 | Conditional Logic |
| 59 | Sanctum of Wrath Finish | 1 | Conditional Logic |
| 60 | Shard of Legends | 1 | Conditional Logic |
| 61 | Shard of Mirrors | 1 | External Dependencies |
| 62 | Shard of Strife | 1 | Conditional Logic |
| 63 | Shrine of Binding | 1 | Conditional Logic |
| 64 | Shrine of Misery | 1 | Conditional Logic |
| 65 | Spine of Night Finish | 1 | Conditional Logic |
| 66 | Spot in the Shade | 1 | Conditional Logic |
| 67 | Statue of Ilthar II Death | 1 | Conditional Logic |
| 68 | SummoningCircle | 1 | Conditional Logic |
| 69 | Talking Tree | 1 | External Dependencies |
| 70 | The Deal | 1 | External Dependencies |
| 71 | The Deep Finish | 1 | Conditional Logic |
| 72 | The Defiled Sanctum Start | 1 | Conditional Logic |
| 73 | The Dream | 1 | External Dependencies |
| 74 | The Ferryman | 1 | External Dependencies |
| 75 | The Fracture | 1 | External Dependencies |
| 76 | The Godscar Wastes Finish | 1 | Conditional Logic |
| 77 | The Silent Reliquary Start | 1 | Conditional Logic |
| 78 | The Suntree | 1 | External Dependencies |
| 79 | TheCardGame | 1 | External Dependencies |
| 80 | TheStew | 1 | Conditional Logic |
| 81 | Trail of Blood | 1 | Conditional Logic |
| 82 | WallOfFire | 1 | Conditional Logic |
| 83 | WindyHillock | 1 | Conditional Logic |
