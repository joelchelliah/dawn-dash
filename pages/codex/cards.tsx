import Head from 'next/head'

import CardCodex from '../../src/pages/CardCodex'

export default function CardexPage() {
  return (
    <>
      <Head>
        <title>Dawn-Dash : Cardex</title>
        <meta
          name="description"
          content="Dawncaster card search & filter - Browse and search through all Dawncaster cards with advanced filtering options"
        />
        <meta property="og:title" content="Dawn-Dash : Cardex" />
        <meta
          property="og:description"
          content="Dawncaster card search & filter - Browse and search through all Dawncaster cards with advanced filtering options"
        />
        <meta property="og:image" content="https://www.dawn-dash.com/og-image-cardex.png" />
        <meta property="og:url" content="https://www.dawn-dash.com/codex/cards" />

        {/* The url shown in Discord */}
        <meta property="og:site_name" content="dawn-dash.com/codex/cards" />

        {/* Allow the large images in Discord */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="twitter:image" content="https://www.dawn-dash.com/og-image-cardex.png" />
      </Head>
      <CardCodex />
    </>
  )
}
