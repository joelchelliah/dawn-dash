export const getSpecialCondition = (weaponName: string): JSX.Element | undefined =>
  SPECIAL_CONDITIONS[weaponName]

const SPECIAL_CONDITIONS: Record<string, JSX.Element> = {
  'Arcane Bow': (
    <>
      The <strong>Arcane Bow</strong> has no hidden conditions.
    </>
  ),
}
