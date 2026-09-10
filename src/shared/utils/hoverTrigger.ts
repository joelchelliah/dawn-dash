/*
 * A hover marker class, applied to whichever ancestor owns the hover, that lets nested components
 * style themselves off it via `:global(.hoverable):hover &`. Keeps the hover styling inside the
 * component it affects, and costs consumers that never hover nothing but the absent class.
 */
export const HOVER_TRIGGER = 'hoverable'
