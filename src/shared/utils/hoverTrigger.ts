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
