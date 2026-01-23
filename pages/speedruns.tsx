import Head from 'next/head'
import dynamic from 'next/dynamic'

const Speedruns = dynamic(() => import('../src/speedruns'), {
  loading: () => <div>Loading speedrun charts...</div>,
})

export default function SpeedrunsPage() {
  const ogTitle = 'Speedruns'
  const title = `Dawn-Dash: ${ogTitle}`

  const description =
    'Interactive Dawncaster speedrun charts, showing world records, fastest times, and leaderboards across all modes, classes and difficulties!'
  const ogDescription =
    'Check out the fastest Dawncaster speedruns! Compare live records across all modes, classes and difficulties!'

  const image = 'https://www.dawn-dash.com/og-image-speedruns.png'
  const url = 'https://www.dawn-dash.com/speedruns'
  const squareLogo = 'https://www.dawn-dash.com/logo-speedruns.png'
  return (
    <>
      <Head>
        <title>{title}</title>
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
        <meta property="og:site_name" content="dawn-dash.com/speedruns" />

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
      <Speedruns />
    </>
  )
}
