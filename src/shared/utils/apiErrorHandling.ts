import { isAxiosError } from 'axios'

export function handleError(error: unknown, msg: string) {
  if (isAxiosError(error)) {
    console.error(msg ?? 'API request failed:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    })
  }
}
