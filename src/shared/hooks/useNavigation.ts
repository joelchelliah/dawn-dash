import { useRouter } from 'next/router'

import { getTool } from '@/shared/config/toolRegistry'

export const useNavigation = () => {
  const router = useRouter()

  const resetToLandingPage = () => {
    router.replace('/')
  }

  const navigateTo = (toolId: string, query?: Record<string, string>) => {
    const tool = getTool(toolId)
    if (!tool) return

    const queryString = query ? `?${new URLSearchParams(query).toString()}` : ''
    router.replace(`${tool.path}${queryString}`)
  }

  return {
    resetToLandingPage,
    navigateTo,
  }
}
