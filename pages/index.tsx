import Head from 'next/head'
import dynamic from 'next/dynamic'

const Speedruns = dynamic(() => import('../src/speedruns'), {
  loading: () => <div>Loading speedrun charts...</div>,
})

export default function SpeedrunsPage() {
  const title = 'Dawn-Dash : Speedruns'
  const description =
    'Interactive Dawncaster speedrun charts, showing world records, fastest times, and leaderboards across all modes, classes and difficulties!'
  const ogDescription =
    'Check out the fastest Dawncaster speedruns! Compare live records across all modes, classes and difficulties!'
  const image = 'https://www.dawn-dash.com/og-image-dawndash.png'
  const url = 'https://www.dawn-dash.com'
  const squareLogo = 'https://www.dawn-dash.com/logo-dawndash.png'
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href="https://www.dawn-dash.com/" />

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
      <Speedruns />
    </>
  )
}
