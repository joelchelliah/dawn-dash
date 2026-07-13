import {
  AbracadabraImageUrl,
  EleganceImageUrl,
  MapOfHuesImageUrl,
  PestilenceDecreeUrl,
  DashImageUrl,
} from '../utils/imageUrls'

export interface ToolDefinition {
  id: string
  path: string
  title: string
  ogTitle: string
  description: string
  shortDescription: string
  // SEO copy rendered by PageHead — distinct from the landing-page descriptions above
  metaDescription: string
  ogDescription: string
  ogImage: string
  logoImage: string
  landingImage: string
  navIcon: string
  legacyPaths?: string[]
}

export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    id: 'cardex',
    path: '/cardex',
    title: 'Cardex',
    ogTitle: '🃏 Cardex',
    description:
      'An interactive codex of all the cards available in Dawncaster, with advanced search and filtering options to help you find and track your cards throughout your runs!',
    shortDescription:
      'An interactive codex of all the cards in Dawncaster, with advanced search and filtering options!',
    metaDescription:
      'Interactive Dawncaster cards codex, with advanced search and filtering options to find and track your cards through your runs!',
    ogDescription:
      'Search and track all Dawncaster cards through your runs, with advanced filtering options!',
    ogImage: 'https://www.dawn-dash.com/og-image-cardex.png',
    logoImage: 'https://www.dawn-dash.com/logo-cardex.png',
    landingImage: '/landing-cardex.webp',
    navIcon: AbracadabraImageUrl,
    legacyPaths: ['/codex/cards'],
  },
  {
    id: 'skilldex',
    path: '/skilldex',
    title: 'Skilldex',
    ogTitle: '🎯 Skilldex',
    description:
      'An interactive codex and skill-tree visualizer of all the talents available in Dawncaster, with advanced search and filtering options to find all talents and their requirements!',
    shortDescription:
      'An interactive codex of all the talents in Dawncaster, with advanced search and filtering options!',
    metaDescription:
      'Interactive Dawncaster talents codex, with advanced search and filtering options to find and show all talents and their requirements!',
    ogDescription:
      'Search and filter through all Dawncaster talents and their requirements, visualized as tiny talent trees!',
    ogImage: 'https://www.dawn-dash.com/og-image-skilldex.png',
    logoImage: 'https://www.dawn-dash.com/logo-skilldex.png',
    landingImage: '/landing-skilldex.webp',
    navIcon: EleganceImageUrl,
    legacyPaths: ['/codex/skills'],
  },
  {
    id: 'eventmaps',
    path: '/eventmaps',
    title: 'Eventmaps',
    ogTitle: '🗺 Eventmaps',
    description:
      'Fully mapped out event trees of all the events in Dawncaster, letting you explore all the possible branching paths, dialogue options, rewards, and dangers of each event!',
    shortDescription:
      'Fully mapped out event trees for all events in Dawncaster, showing all options and rewards for each event!',
    metaDescription:
      'Interactive Dawncaster events codex, with fully mapped out branches and options, to help you get the best outcome from each event!',
    ogDescription:
      'Explore all Dawncaster events, as fully mapped out event trees, including all dialogue options, requirements and rewards!',
    ogImage: 'https://www.dawn-dash.com/og-image-eventmaps.png',
    logoImage: 'https://www.dawn-dash.com/logo-eventmaps.png',
    landingImage: '/landing-eventmaps.webp',
    navIcon: MapOfHuesImageUrl,
    legacyPaths: ['/codex/events'],
  },
  {
    id: 'scoring',
    path: '/scoring',
    title: 'Scoring',
    ogTitle: '🧮 Scoring',
    description:
      'Detailed Dawncaster scoring guides, specifically tailored to each game mode, to help you maximize your scores in Standard, Sunforge, and the Weekly Challenges!',
    shortDescription:
      'Detailed Dawncaster scoring guides, covering Standard mode, Sunforge, and the Weekly Challenges!',
    metaDescription:
      'Detailed Dawncaster scoring guides, specifically tailored to help you maximize your scores in Standard mode, Sunforge, and the Weekly Challenges!',
    ogDescription:
      'Detailed Dawncaster scoring guides, for Standard mode, Sunforge, and the Weekly Challenges!',
    ogImage: 'https://www.dawn-dash.com/og-image-scoring.png',
    logoImage: 'https://www.dawn-dash.com/logo-scoring.png',
    landingImage: '/landing-scoring.webp',
    navIcon: PestilenceDecreeUrl,
  },
  {
    id: 'speedruns',
    path: '/speedruns',
    title: 'Speedruns',
    ogTitle: '🏃‍♂️ Speedruns',
    description:
      'Speedrun charts, records, and statistics for all game modes and difficulties in Dawncaster, based on player-submitted data from Blightbane.io!',
    shortDescription:
      'Speedrun charts, records, and statistics for all game modes and difficulties in Dawncaster!',
    metaDescription:
      'Interactive Dawncaster speedrun charts, showing world records, fastest times, and leaderboards across all modes, classes and difficulties!',
    ogDescription:
      'Check out the fastest Dawncaster speedruns! Compare live records across all modes, classes and difficulties!',
    ogImage: 'https://www.dawn-dash.com/og-image-speedruns.png',
    logoImage: 'https://www.dawn-dash.com/logo-speedruns.png',
    landingImage: '/landing-speedruns.webp',
    navIcon: DashImageUrl,
  },
]

export const getTool = (id: string): ToolDefinition | undefined =>
  TOOL_REGISTRY.find((t) => t.id === id)
