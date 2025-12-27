import Head from 'next/head'
import dynamic from 'next/dynamic'

const Cards = dynamic(() => import('../../src/codex/cards'), {
  loading: () => <div>Loading cardex...</div>,
})

export default function CardexPage() {
  return (
    <>
      <Head>
        <title>Dawn-Dash : Cardex</title>
        <meta
          name="description"
          content="Interactive Dawncaster card codex, with advanced search and filtering options to find and track your cards through your runs!"
        />
        <link rel="canonical" href="https://www.dawn-dash.com/codex/cards" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Dawn-Dash : Cardex" />
        <meta
          property="og:description"
          content="Interactive Dawncaster card codex! Search and track all cards in the game, with advanced filtering options!"
        />
        <meta property="og:image" content="https://www.dawn-dash.com/og-image-cardex.png" />
        <meta property="og:url" content="https://www.dawn-dash.com/codex/cards" />

        {/* The url shown in Discord */}
        <meta property="og:site_name" content="dawn-dash.com/codex/cards" />

        <meta property="twitter:image" content="https://www.dawn-dash.com/og-image-cardex.png" />
      </Head>
      <Cards />
    </>
  )
}
