import { useEffect } from 'react'

import Head from 'next/head'
import { useRouter } from 'next/router'

import { SPEEDRUNS_URL_PARAMS } from '@/speedruns/constants/chartControlValues'
import Landing from '@/landing'

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    if (router.isReady) {
      const hasWhitelistedParams = SPEEDRUNS_URL_PARAMS.some((param) => param in router.query)

      if (hasWhitelistedParams) {
        router.replace({
          pathname: '/speedruns',
          query: router.query,
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query])

  const title = 'Dawn-Dash'
  const description =
    'Dawncaster tools and resources, including interactive codexes for cards and talents, event-tree visualizer, and speedrun charts!'
  const ogDescription =
    'Useful tools for Dawncaster, including advanced cards/talents search, event-tree visualizer, and speedrun charts!'
  const image = 'https://www.dawn-dash.com/og-image-dawndash.png'
  const url = 'https://www.dawn-dash.com'
  const squareLogo = 'https://www.dawn-dash.com/logo-dawndash.png'
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={image} />
        <meta property="og:url" content={url} />

        {/* The url shown in Discord */}
        <meta property="og:site_name" content="dawn-dash.com" />

        <meta property="twitter:image" content={image} />

        {/* Page-Specific Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: title,
              description,
              url,
              image: squareLogo,
            }),
          }}
        />
      </Head>
      <Landing />
    </>
  )
}
