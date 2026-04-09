export const isNotNullOrUndefined = <T>(value: T): value is NonNullable<T> =>
  value !== null && value !== undefined

export const isNonEmptyString = (value: string | null | undefined): value is string =>
  isNotNullOrUndefined(value) && value.trim() !== ''
