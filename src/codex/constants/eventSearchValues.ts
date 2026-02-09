export const ALL_EVENTS_INDEX = -1

export enum LoopingPathMode {
  INDICATOR = 'indicator',
  LINK = 'link',
}

export const LOOPING_PATH_MODES = [LoopingPathMode.INDICATOR, LoopingPathMode.LINK] as const

export enum TreeNavigationMode {
  SCROLL = 'scroll',
  DRAG = 'drag',
}

export const TREE_NAVIGATION_MODES = [TreeNavigationMode.SCROLL, TreeNavigationMode.DRAG] as const

export enum LevelOfDetail {
  COMPACT = 'compact',
  BALANCED = 'balanced',
  WALL_OF_TEXT = 'wall-of-text',
}

export const LEVEL_OF_DETAIL_OPTIONS = [
  LevelOfDetail.COMPACT,
  LevelOfDetail.BALANCED,
  LevelOfDetail.WALL_OF_TEXT,
] as const
