import { useEffect, useState } from 'react'

import moment from 'moment'

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

    setFromNow(`${prefix} ${moment(timestamp).fromNow()}`)
    const timer = setInterval(() => {
      setFromNow(`${prefix} ${moment(timestamp).fromNow()}`)
    }, 1000)

    return () => clearInterval(timer)
  }, [timestamp, prefix])

  return fromNow || null
}
