import Head from 'next/head'
import dynamic from 'next/dynamic'

const Skills = dynamic(() => import('../../src/codex/skills'), {
  loading: () => <div>Loading skilldex...</div>,
})

export default function SkilldexPage() {
  return (
    <>
      <Head>
        <title>Dawn-Dash : Skilldex</title>
        <meta
          name="description"
          content="Interactive Dawncaster talent codex, with advanced search and filtering options to find and show all in-game talents and their requirements!"
        />
        <link rel="canonical" href="https://www.dawn-dash.com/codex/skills" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Dawn-Dash : Skilldex" />
        <meta
          property="og:description"
          content="Interactive Dawncaster talent codex! Search through all in-game talents and their requirements, visualized in tiny talent trees!"
        />
        <meta property="og:image" content="https://www.dawn-dash.com/og-image-skilldex.png" />
        <meta property="og:url" content="https://www.dawn-dash.com/codex/skills" />

        {/* The url shown in Discord */}
        <meta property="og:site_name" content="dawn-dash.com/codex/skills" />

        <meta property="twitter:image" content="https://www.dawn-dash.com/og-image-skilldex.png" />
      </Head>
      <Skills />
    </>
  )
}
