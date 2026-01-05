export const ZOOM_LEVELS = ['auto', 'cover', 100, 200, 300] as const
export type ZoomLevel = (typeof ZOOM_LEVELS)[number]
