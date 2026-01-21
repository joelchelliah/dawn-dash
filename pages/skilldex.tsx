import Head from 'next/head'
import dynamic from 'next/dynamic'

const Skills = dynamic(() => import('../src/codex/skills'), {
  loading: () => <div>Loading skilldex...</div>,
})

export default function SkilldexPage() {
  const title = 'Dawn-Dash : Skilldex'
  const description =
    'Interactive Dawncaster talents codex, with advanced search and filtering options to find and show all talents and their requirements!'
  const ogDescription =
    'Search and filter through all Dawncaster talents and their requirements, visualized as tiny talent trees!'
  const image = 'https://www.dawn-dash.com/og-image-skilldex.png'
  const url = 'https://www.dawn-dash.com/skilldex'
  const squareLogo = 'https://www.dawn-dash.com/logo-skilldex.png'

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
        <meta property="og:site_name" content="dawn-dash.com/skilldex" />

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
      <Skills />
    </>
  )
}
