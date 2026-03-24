import Head from 'next/head'
import dynamic from 'next/dynamic'

const Weekly = dynamic(() => import('../src/weekly'), {
  loading: () => <div>Loading weekly challenge...</div>,
})

export default function WeeklyPage() {
  const ogTitle = '📅 Weekly Challenge'
  const title = `Dawn-Dash: ${ogTitle}`

  const description =
    'See a full breakdown of the latest Dawncaster weekly challenge, including scoring rules, setups, and available cards and talents!'
  const ogDescription = 'Full breakdown of the current Dawncaster weekly challenge!'

  const image = 'https://www.dawn-dash.com/og-image-weekly.png'
  const url = 'https://www.dawn-dash.com/weekly'
  const squareLogo = 'https://www.dawn-dash.com/logo-weekly.png'

  return (
    <>
      <Head>
        <title>Weekly Challenge | Dawn-Dash</title>
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
        <meta property="og:site_name" content="dawn-dash.com/weekly" />

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
      <Weekly />
    </>
  )
}
