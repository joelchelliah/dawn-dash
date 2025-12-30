import Head from 'next/head'
import dynamic from 'next/dynamic'

const Events = dynamic(() => import('../../src/codex/events'), {
  loading: () => <div>Loading events...</div>,
})

export default function QuestlogPage() {
  const title = 'Dawn-Dash : Questlog'
  const description =
    'Interactive Dawncaster events codex, with fully mapped out branches and options, to help you get the best outcome from each event!'
  const ogDescription =
    'Explore all Dawncaster events, as fully mapped out dialogue trees, including all dialogue options, requirements and rewards!'
  // TODO: Update this once the Questlog is ready
  const image = 'https://www.dawn-dash.com/og-image-questlog-WIP.png'
  const url = 'https://www.dawn-dash.com/codex/events'
  const squareLogo = 'https://www.dawn-dash.com/logo-questlog.png'

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        {/* TODO: Remove this once the Questlog is ready */}
        <meta name="robots" content="noindex, nofollow" />
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
