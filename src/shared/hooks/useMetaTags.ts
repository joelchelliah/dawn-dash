import { useLocation } from 'react-router-dom'

interface MetaTags {
  title: string
  description: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  ogUrl: string
  ogSiteName: string
  twitterImage: string
}

const META_TAGS_BY_ROUTE: Record<string, MetaTags> = {
  '/': {
    title: 'Dawn-Dash : Speedruns',
    description: 'Dawncaster speedrun charts, records and more!',
    ogTitle: 'Dawn-Dash : Speedruns',
    ogDescription: 'Dawncaster speedrun charts, records and more!',
    ogImage: 'https://dawn-dash.com/og-image-dawndash.png',
    ogUrl: 'https://dawn-dash.com',
    ogSiteName: 'dawn-dash.com',
    twitterImage: '/og-image-dawndash.png',
  },
  '/codex/cards': {
    title: 'Dawn-Dash : Cardex',
    description:
      'Dawncaster card search & filter - Browse and search through all Dawncaster cards with advanced filtering options',
    ogTitle: 'Dawn-Dash : Cardex',
    ogDescription:
      'Dawncaster card search & filter - Browse and search through all Dawncaster cards with advanced filtering options',
    ogImage: 'https://dawn-dash.com/og-image-cardex.png',
    ogUrl: 'https://dawn-dash.com/codex/cards',
    ogSiteName: 'dawn-dash.com/codex/cards',
    twitterImage: '/og-image-cardex.png',
  },
  '/codex/wip/super-secret/dont-look/talents': {
    title: 'Dawn-Dash : Skilldex',
    description:
      'Dawncaster talent search & filter - Browse and search through all Dawncaster talents with advanced filtering options',
    ogTitle: 'Dawn-Dash : Skilldex',
    ogDescription:
      'Dawncaster talent search & filter - Browse and search through all Dawncaster talents with advanced filtering options',
    // TODO: Create custom OG image for talents page (e.g., og-image-talents.png)
    ogImage: 'https://dawn-dash.com/og-image-default.png',
    ogUrl: 'https://dawn-dash.com/codex/wip/super-secret/dont-look/talents',
    ogSiteName: 'dawn-dash.com',
    twitterImage: '/og-image-default.png',
  },
}

export const useMetaTags = (): MetaTags => {
  const location = useLocation()
  const pathname = location.pathname

  return META_TAGS_BY_ROUTE[pathname] || META_TAGS_BY_ROUTE['/']
}
