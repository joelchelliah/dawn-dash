// middleware.js
// eslint-disable-next-line import/no-unresolved
import { NextResponse } from '@vercel/edge'

const BOT_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'yandex',
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest',
  'slackbot',
  'vkShare',
  'W3C_Validator',
  'redditbot',
  'applebot',
  'whatsapp',
  'flipboard',
  'tumblr',
  'bitlybot',
  'SkypeUriPreview',
  'nuzzel',
  'Discordbot',
  'Google Page Speed',
  'Qwantify',
  'pinterestbot',
  'Bitrix link preview',
  'XING-contenttabreceiver',
  'Chrome-Lighthouse',
]

export function middleware(request) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || ''
  const isBot = BOT_USER_AGENTS.some((bot) => userAgent.includes(bot.toLowerCase()))

  if (isBot) {
    const url = request.nextUrl
    // Build the path for the prerender API
    const path = url.pathname + (url.search || '')
    return NextResponse.rewrite(`/api/prerender?path=${encodeURIComponent(path)}`)
  }

  // Let all other requests through
  return NextResponse.next()
}

// Used for Vercel Edge Runtime
export const config = {
  matcher: '/:path*',
}
