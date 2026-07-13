import Head from 'next/head'

import { getTool } from '@/shared/config/toolRegistry'

const BASE_URL = 'https://www.dawn-dash.com'

interface PageHeadProps {
  toolId: string
}

export function PageHead({ toolId }: PageHeadProps) {
  const tool = getTool(toolId)
  if (!tool) return null

  const title = `Dawn-Dash: ${tool.ogTitle}`
  const url = `${BASE_URL}${tool.path}`

  return (
    <Head>
      <title>{`${tool.title} | Dawn-Dash`}</title>
      <meta name="description" content={tool.metaDescription} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={tool.ogTitle} />
      <meta property="og:description" content={tool.ogDescription} />
      <meta property="og:image" content={tool.ogImage} />
      <meta property="og:image:width" content="2400" />
      <meta property="og:image:height" content="1260" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:url" content={url} />

      {/* The url shown in Discord */}
      <meta property="og:site_name" content={`dawn-dash.com${tool.path}`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={tool.metaDescription} />
      <meta property="twitter:image" content={tool.ogImage} />

      {/* Page-Specific Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: title,
            description: tool.metaDescription,
            url,
            image: tool.logoImage,
          }),
        }}
      />
    </Head>
  )
}
