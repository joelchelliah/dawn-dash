/*
 * Marks a result card as struck (tracked), applied to the row alongside `HOVER_TRIGGER`. Nested
 * components style themselves off it via `:global(.struck)`, and hover rules exclude it with
 * `:not(:global(.struck))` so a struck row keeps its motion but loses its brightening.
 */
export const STRUCK_TRIGGER = 'struck'
