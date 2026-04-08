import Head from 'next/head'
import dynamic from 'next/dynamic'

const Scoring = dynamic(() => import('../src/scoring'), {
  loading: () => <div>Loading scoring guide...</div>,
})

export default function ScoringPage() {
  const ogTitle = '🧮 Scoring'
  const title = `Dawn-Dash: ${ogTitle}`

  const description =
    'Detailed Dawncaster scoring guides, specifically tailored to help you maximize your scores in Standard mode, Sunforge, and the Weekly Challenges!'
  const ogDescription =
    'Detailed Dawncaster scoring guides, specifically tailored for Standard mode, Sunforge, and the Weekly Challenges!'

  const image = 'https://www.dawn-dash.com/og-image-scoring.png'
  const url = 'https://www.dawn-dash.com/scoring'
  const squareLogo = 'https://www.dawn-dash.com/logo-scoring.png'

  return (
    <>
      <Head>
        <title>Scoring | Dawn-Dash</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={image} />
        <meta property="og:image:width" content="2400" />
        <meta property="og:image:height" content="1260" />
        <meta property="og:image:alt" content={title} />
        <meta property="og:url" content={url} />

        {/* The url shown in Discord */}
        <meta property="og:site_name" content="dawn-dash.com/scoring" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
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
      <Scoring />
    </>
  )
}
