import {
  AbracadabraImageUrl,
  EleganceImageUrl,
  MapOfHuesImageUrl,
  PestilenceDecreeUrl,
  DashImageUrl,
  BootyImageUrl,
} from '../utils/imageUrls'

export interface ToolDefinition {
  id: string
  path: string
  title: string
  ogTitle: string
  // Doubles as the SEO meta description as well as the landing page's desktop hover panel.
  // Google truncates the search snippet around 155 characters, so keep it under that!
  description: string
  // Landing page mobile card only; the hover panel is pointer-only so the two never co-render.
  // Keep it short!
  shortDescription: string
  // Discord/Slack/Twitter card blurb. For readers who already know the game.
  ogDescription: string
  ogImage: string
  logoImage: string
  landingImage: string
  navIcon: string
  legacyPaths?: string[]
  // Work-in-progress tools: reachable by direct URL, but kept out of the landing page and side
  // menu, and marked noindex by PageHead so search engines skip them until launch.
  unlisted?: boolean
}

export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    id: 'cardex',
    path: '/cardex',
    title: 'Cardex',
    ogTitle: '🃏 Cardex',
    description:
      'An interactive codex of all the cards in Dawncaster, with advanced search and filtering options to help you find and track your cards through your runs!',
    shortDescription:
      'A visual codex of all the cards in Dawncaster, with advanced search and filtering!',
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
      'An interactive skill-tree visualizer for all the talents in Dawncaster, with advanced search and filtering to find every talent and its requirements!',
    shortDescription:
      'Skill trees of all the talents in Dawncaster, with advanced search and filtering!',
    ogDescription:
      'Browse and filter through all Dawncaster talents and their requirements, shown as tiny skill trees!',
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
      'Fully mapped out event trees for every event in Dawncaster, letting you explore all the branching paths, dialogue options, and rewards!',
    shortDescription:
      'Event trees for all events in Dawncaster, showing all paths, dialogue and rewards!',
    ogDescription:
      'Explore every Dawncaster event, as a fully mapped out event tree, with all dialogue options and rewards!',
    ogImage: 'https://www.dawn-dash.com/og-image-eventmaps.png',
    logoImage: 'https://www.dawn-dash.com/logo-eventmaps.png',
    landingImage: '/landing-eventmaps.webp',
    navIcon: MapOfHuesImageUrl,
    legacyPaths: ['/codex/events'],
  },
  {
    id: 'booty',
    path: '/booty',
    title: 'Booty',
    ogTitle: '🪎 Booty',
    description:
      'A full breakdown of every treasure card in Dawncaster, and all the various ways of acquiring them during your runs!',
    shortDescription:
      'A breakdown of all treasure cards in Dawncaster, and how to find them during your runs!',
    ogDescription:
      'Delve into all the available treasure cards in Dawncaster, and the secrets to finding them!',
    ogImage: 'https://www.dawn-dash.com/og-image-booty.png',
    logoImage: 'https://www.dawn-dash.com/logo-booty.png',
    landingImage: '/landing-booty.webp',
    navIcon: BootyImageUrl,
    unlisted: true,
  },
  {
    id: 'scoring',
    path: '/scoring',
    title: 'Scoring',
    ogTitle: '🧮 Scoring',
    description:
      'Detailed Dawncaster scoring guides, specifically tailored to help you maximize your scores in Standard mode, Sunforge, and the Weekly Challenges!',
    shortDescription:
      'Dawncaster scoring guides, for Standard mode, Sunforge, and the Weekly Challenges!',
    ogDescription:
      'Maximize your scores in Standard mode, Sunforge, or any of the Weekly Challenges runs!',
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
      'Interactive Dawncaster speedrun charts, records, and stats across all game modes, classes and difficulties, based on data from Blightbane.io!',
    shortDescription:
      'Speedrun charts, records, and stats for all game modes and difficulties in Dawncaster!',
    ogDescription:
      'Check out the fastest Dawncaster runs, and compare live records across all modes and difficulties!',
    ogImage: 'https://www.dawn-dash.com/og-image-speedruns.png',
    logoImage: 'https://www.dawn-dash.com/logo-speedruns.png',
    landingImage: '/landing-speedruns.webp',
    navIcon: DashImageUrl,
  },
]

export const getTool = (id: string): ToolDefinition | undefined =>
  TOOL_REGISTRY.find((t) => t.id === id)

export const getListedTools = (): ToolDefinition[] => TOOL_REGISTRY.filter((t) => !t.unlisted)
