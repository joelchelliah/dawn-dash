import { createContext, useContext } from 'react'

import { UseCardData } from '@/codex/hooks/useCardData'

const BootyCardDataContext = createContext<UseCardData | null>(null)

export const BootyCardDataProvider = BootyCardDataContext.Provider

export function useBootyCardData(): UseCardData {
  const context = useContext(BootyCardDataContext)

  if (!context) {
    throw new Error('useBootyCardData must be used within a BootyCardDataProvider')
  }

  return context
}
