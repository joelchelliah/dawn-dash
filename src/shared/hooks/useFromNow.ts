import { useEffect, useState } from 'react'

import { formatDistanceToNow } from 'date-fns'

const ONE_SECOND = 1000
const ONE_MINUTE = 60 * ONE_SECOND
const ONE_HOUR = 60 * ONE_MINUTE

// Refresh often while the label changes by the second, rarely once it only changes hourly
const getRefreshInterval = (timestamp: number) => {
  const age = Date.now() - timestamp

  if (age < ONE_MINUTE) return ONE_SECOND
  if (age < ONE_HOUR) return ONE_MINUTE

  return ONE_HOUR
}

/**
 * Returns a string representing the time since the given timestamp.
 * @param timestamp - The timestamp to calculate the time since.
 * @returns A string representing the time since the given timestamp.
 */
export function useFromNow(timestamp: number | null, prefix: string) {
  const [fromNow, setFromNow] = useState<string>('')

  useEffect(() => {
    if (!timestamp) {
      setFromNow('')
      return
    }

    const update = () => {
      const next = `${prefix} ${formatDistanceToNow(new Date(timestamp))} ago`
      setFromNow((prev) => (prev === next ? prev : next))
    }

    let timer: ReturnType<typeof setTimeout>
    const scheduleNextUpdate = () => {
      timer = setTimeout(() => {
        update()
        scheduleNextUpdate()
      }, getRefreshInterval(timestamp))
    }

    update()
    scheduleNextUpdate()

    return () => clearTimeout(timer)
  }, [timestamp, prefix])

  return fromNow || null
}
