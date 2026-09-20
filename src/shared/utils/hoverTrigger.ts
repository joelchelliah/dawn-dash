/*
 * A hover marker class, applied to whichever ancestor owns the hover, that lets nested components
 * style themselves off it via `:global(.hoverable):hover &`. Keeps the hover styling inside the
 * component it affects, and costs consumers that never hover nothing but the absent class.
 */
export const HOVER_TRIGGER = 'hoverable'

/*
 * The touch-device stand-in for hover, applied to the same ancestor alongside `HOVER_TRIGGER` while
 * the element sits in the viewport's focus band — see `useFocusBand`. Nested components opt in by
 * pairing `:global(.hoverable.focused) &` with their existing `:global(.hoverable):hover &` rule.
 */
export const FOCUS_TRIGGER = 'focused'

/*
 * Applied alongside `HOVER_TRIGGER` by a container that owns hover for its own chrome but not for
 * the rows nested inside it — a treasure-pool card wrapping a list whose rows are hoverable in
 * their own right. Without it the card's hover reaches every nested artwork at once, since the
 * descendant selectors match any `.hoverable` ancestor rather than the nearest one.
 */
export const HOVER_TRIGGER_SHALLOW = 'hoverable-shallow'
