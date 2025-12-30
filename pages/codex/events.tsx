import Head from 'next/head'
import dynamic from 'next/dynamic'

const Events = dynamic(() => import('../../src/codex/events'), {
  loading: () => <div>Loading events...</div>,
})

export default function EventdexPage() {
  const title = 'Dawn-Dash : Eventdex'
  const description =
    'Interactive Dawncaster events codex, for visualizing all opportunities in the game, along with their dialogue options, requirements and effects!'
  const ogDescription =
    'Explore all Dawncaster events, along with their dialogue options, requirements and effects, visualized in a tree structure!'
  const image = 'https://www.dawn-dash.com/og-image-eventdex.png'
  const url = 'https://www.dawn-dash.com/codex/events'
  const squareLogo = 'https://www.dawn-dash.com/logo-eventdex.png'

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
        <meta property="og:site_name" content="dawn-dash.com/codex/events" />

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
      <Events />
    </>
  )
}
