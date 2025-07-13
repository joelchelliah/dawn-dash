import { Helmet } from 'react-helmet-async'

import { useMetaTags } from '../../hooks/useMetaTags'

const MetaTags = () => {
  const metaTags = useMetaTags()

  return (
    <Helmet>
      <title>{metaTags.title}</title>
      <meta name="description" content={metaTags.description} />

      {/* Open Graph */}
      <meta property="og:title" content={metaTags.ogTitle} />
      <meta property="og:description" content={metaTags.ogDescription} />
      <meta property="og:image" content={metaTags.ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={metaTags.ogUrl} />
      <meta property="og:type" content="website" />

      {/* The url shown in discord */}
      <meta property="og:site_name" content={metaTags.ogSiteName} />

      {/* These twitter tags are what allow the large images in discord */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:image" content={metaTags.twitterImage} />

      {/* Discord stripe color */}
      <meta name="theme-color" content="#249624"></meta>
    </Helmet>
  )
}

export default MetaTags
