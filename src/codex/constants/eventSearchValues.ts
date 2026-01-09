export const ZOOM_LEVELS = ['auto', 'cover', 100, 200, 300] as const
export type ZoomLevel = (typeof ZOOM_LEVELS)[number]

export enum LoopingPathMode {
  INDICATOR = 'indicator',
  LINK = 'link',
}

export const LOOPING_PATH_MODES = [LoopingPathMode.INDICATOR, LoopingPathMode.LINK] as const
