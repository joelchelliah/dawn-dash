import { useEffect, useState } from 'react'

import { useRouter } from 'next/router'

import { ALL_EVENTS_INDEX } from '../constants/eventSearchValues'
import { Event } from '../types/events'

interface UseEventUrlParam {
  isInvalidEvent: boolean
  eventNameFromParam: string | undefined
}

export function useEventUrlParam(
  events: Event[],
  setSelectedEventIndex: (index: number) => void
): UseEventUrlParam {
  const router = useRouter()
  const eventParam = router.query.event as string | undefined
  const [isInvalidEvent, setIsInvalidEvent] = useState(false)
  const [lastProcessedParam, setLastProcessedParam] = useState<string | undefined>()

  useEffect(() => {
    if (!router.isReady) return
    if (eventParam === lastProcessedParam) return

    if (eventParam) {
      const foundIndex = findEventIndexByName(events, eventParam)

      if (foundIndex === ALL_EVENTS_INDEX) {
        setSelectedEventIndex(ALL_EVENTS_INDEX)
        setIsInvalidEvent(true)
      } else {
        setSelectedEventIndex(foundIndex)
        setIsInvalidEvent(false)
      }

      setLastProcessedParam(eventParam)
    } else {
      setIsInvalidEvent(false)
      setLastProcessedParam(undefined)
    }
  }, [router.isReady, eventParam, events, setSelectedEventIndex, lastProcessedParam])

  return { isInvalidEvent, eventNameFromParam: getEventNameFromUrlParam(eventParam) }
}

export function normalizeEventNameForUrl(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_')
}

export function getEventNameFromUrlParam(urlParam: string | undefined): string | undefined {
  return urlParam ? urlParam.replaceAll('_', ' ') : undefined
}

export function findEventByName(events: Event[], urlParam: string): Event | null {
  const normalizedParam = urlParam.toLowerCase()

  const event = events.find((event) => {
    const normalizedName = normalizeEventNameForUrl(event.name)
    return normalizedName === normalizedParam
  })

  return event || null
}

function findEventIndexByName(events: Event[], urlParam: string): number {
  const normalizedParam = urlParam.toLowerCase()

  const index = events.findIndex((event) => {
    const normalizedName = normalizeEventNameForUrl(event.name)
    return normalizedName === normalizedParam
  })

  return index >= 0 ? index : ALL_EVENTS_INDEX
}
