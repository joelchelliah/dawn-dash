/**
 * Log a warning when a spacing pass reaches its maximum number of sweeps
 * without converging (see config.ts and README.md for why this can happen).
 */
export const logMaxSweepsWarning = (passName: string, maxSweeps: number, message: string): void => {
  // eslint-disable-next-line no-console
  console.error(
    `adjustHorizontalNodeSpacing: ${passName} reached maximum iterations (${maxSweeps}). ${message}`
  )
}
