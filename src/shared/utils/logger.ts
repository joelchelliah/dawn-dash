const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  debug: (...args: unknown[]): void => {
    // eslint-disable-next-line no-console
    if (isDevelopment) console.log(...args)
  },
  warn: (...args: unknown[]): void => {
    if (isDevelopment) console.warn(...args)
  },
  error: (...args: unknown[]): void => {
    console.error(...args)
  },
}
