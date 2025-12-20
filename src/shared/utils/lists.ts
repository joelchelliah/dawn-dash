/**
 * Compares two arrays of objects or strings for equality
 *
 * @param a First array to compare
 * @param b Second array to compare
 * @param compareKey Optional key to use for comparison (for arrays of objects)
 * @returns boolean indicating if arrays are equal
 */
export const isArrayEqual = <T extends string | object>(
  a: T[],
  b: T[],
  compareKey?: keyof T
): boolean => {
  if (a.length !== b.length) return false
  if (JSON.stringify(a) === JSON.stringify(b)) return true

  if (compareKey !== undefined) {
    const aValues = a.map((item) => (typeof item === 'object' ? item[compareKey] : item))
    const bValues = b.map((item) => (typeof item === 'object' ? item[compareKey] : item))

    return JSON.stringify(aValues) === JSON.stringify(bValues)
  }

  return false
}

export const isNotNullOrEmpty = <T>(list: T[] | null | undefined): list is NonNullable<T>[] => {
  return list !== null && list !== undefined && list.length > 0
}

export const isNullOrEmpty = <T>(list: T[] | null | undefined): list is null | undefined => {
  return list === null || list === undefined || list.length === 0
}
