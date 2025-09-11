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
          content="Dawncaster cards - Browse and search through all Dawncaster cards with advanced filtering options!"
        />

        <meta property="og:title" content="Dawn-Dash : Cardex" />
        <meta
          property="og:description"
          content="Dawncaster cards - Browse and search through all Dawncaster cards with advanced filtering options!"
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
