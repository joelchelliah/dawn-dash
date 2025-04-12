export const isNotNullOrUndefined = <T>(value: T): value is NonNullable<T> =>
  value !== null && value !== undefined
