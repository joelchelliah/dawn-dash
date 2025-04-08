import { useEffect, useState } from 'react'

import moment from 'moment'

/**
 * Returns a string representing the time since the given timestamp.
 * @param timestamp - The timestamp to calculate the time since.
 * @returns A string representing the time since the given timestamp.
 */
export function useFromNow(timestamp: number | null, prefix: string) {
  const [fromNow, setFromNow] = useState<string | 'Never'>(() =>
    timestamp ? moment(timestamp).fromNow() : 'Never'
  )

  useEffect(() => {
    if (!timestamp) {
      setFromNow('Never')
      return
    }

    setFromNow(moment(timestamp).fromNow())
    const timer = setInterval(() => {
      setFromNow(moment(timestamp).fromNow())
    }, 1000)

    return () => clearInterval(timer)
  }, [timestamp])

  return fromNow === 'Never' ? null : `${prefix} ${fromNow}`
}
