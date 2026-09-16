const SPECIAL_CONDITIONS: Record<string, JSX.Element> = {}

export const getSpecialCondition = (weaponName: string): JSX.Element | undefined =>
  SPECIAL_CONDITIONS[weaponName]
