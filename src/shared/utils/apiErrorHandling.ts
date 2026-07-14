import { isAxiosError } from 'axios'

import { logger } from './logger'

export interface ApiErrorInfo {
  message: string
  status?: number
  data?: unknown
}

export function handleError(error: unknown, msg: string): ApiErrorInfo {
  let errorInfo: ApiErrorInfo

  if (isAxiosError(error)) {
    errorInfo = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    }
  } else if (error instanceof Error) {
    errorInfo = { message: error.message }
  } else {
    errorInfo = { message: String(error) }
  }

  logger.error(msg, errorInfo)

  return errorInfo
}
