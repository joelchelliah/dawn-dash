import Head from 'next/head'
import dynamic from 'next/dynamic'

const Cards = dynamic(() => import('../src/codex/cards'), {
  loading: () => <div>Loading cardex...</div>,
})

export default function CardexPage() {
  const ogTitle = '🃏 Cardex'
  const title = `Dawn-Dash: ${ogTitle}`

  const description =
    'Interactive Dawncaster cards codex, with advanced search and filtering options to find and track your cards through your runs!'
  const ogDescription =
    'Search and track all Dawncaster cards through your runs, with advanced filtering options!'

  const image = 'https://www.dawn-dash.com/og-image-cardex.png'
  const url = 'https://www.dawn-dash.com/cardex'
  const squareLogo = 'https://www.dawn-dash.com/logo-cardex.png'

  return (
    <>
      <Head>
        <title>Cardex | Dawn-Dash</title>
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
        <meta property="og:site_name" content="dawn-dash.com/cardex" />

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
      <Cards />
    </>
  )
}
