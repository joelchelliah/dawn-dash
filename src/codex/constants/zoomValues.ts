export enum ZoomLevel {
  COVER = 'cover',
  x100 = 100,
  x150 = 150,
  x200 = 200,
}

export const ZOOM_LEVELS = [
  ZoomLevel.COVER,
  ZoomLevel.x100,
  ZoomLevel.x150,
  ZoomLevel.x200,
] as const

export const MAX_ZOOM_LEVEL = ZoomLevel.x200

export const ZOOM_LABEL_MAP = {
  [ZoomLevel.COVER]: 'Cover',
  [ZoomLevel.x100]: '100%',
  [ZoomLevel.x150]: '150%',
  [ZoomLevel.x200]: '200%',
}
