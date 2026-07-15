import { logger } from '@/shared/utils/logger'

/**
 * Log a warning when a spacing pass reaches its maximum number of sweeps
 * without converging (see config.ts and README.md for why this can happen).
 * Dev-only: layout still completes (just slightly less tidy), so production
 * users shouldn't see console noise for it.
 */
export const logMaxSweepsWarning = (passName: string, maxSweeps: number, message: string): void => {
  logger.warn(
    `adjustHorizontalNodeSpacing: ${passName} reached maximum iterations (${maxSweeps}). ${message}`
  )
}
