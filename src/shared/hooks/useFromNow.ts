import { useEffect, useState } from 'react'

import { formatDistanceToNow } from 'date-fns'

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

    setFromNow(`${prefix} ${formatDistanceToNow(new Date(timestamp))} ago`)
    const timer = setInterval(() => {
      setFromNow(`${prefix} ${formatDistanceToNow(new Date(timestamp))} ago`)
    }, 1000)

    return () => clearInterval(timer)
  }, [timestamp, prefix])

  return fromNow || null
}
