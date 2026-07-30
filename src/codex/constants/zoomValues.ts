/**
 * Zoom is either "fit the tree to the container" (Cover) or a numeric level.
 *
 * A plain type rather than an enum: both trees do arithmetic on the numeric
 * levels, and `ZOOM_STOPS` is the single source of truth for which values the
 * zoom controls offer. Any number satisfies the type, but the only producers
 * are the zoom controls, which emit `ZOOM_STOPS` members.
 *
 * The numbers are not literal percentages in every case — see the scaling
 * comments in `useEventTreeZoom.ts` and `TalentTree`'s `getZoomScale`.
 */
export type ZoomLevel = typeof COVER | number

// `as const` matters: it gives COVER the literal type 'cover', so a
// `zoomLevel === COVER` check narrows ZoomLevel down to `number` and the
// numeric scaling maths typechecks without casts.
export const COVER = 'cover' as const

export const ZOOM_STOPS: readonly ZoomLevel[] = [COVER, 100, 125, 150, 175, 200]

export const MAX_ZOOM_LEVEL = 200

export const formatZoomLabel = (zoom: ZoomLevel): string => (zoom === COVER ? 'Cover' : `${zoom}%`)
