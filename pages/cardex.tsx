import Head from 'next/head'
import dynamic from 'next/dynamic'

const Cards = dynamic(() => import('../src/codex/cards'), {
  loading: () => <div>Loading cardex...</div>,
})

export default function CardexPage() {
  const title = 'Dawn-Dash : Cardex'
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
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={image} />
        <meta property="og:url" content={url} />

        {/* The url shown in Discord */}
        <meta property="og:site_name" content="dawn-dash.com/cardex" />

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
