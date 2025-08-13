import Head from 'next/head'

import Skills from '../../src/codex/skills'

export default function SkilldexPage() {
  return (
    <>
      <Head>
        <title>Dawn-Dash : Skilldex</title>
        <meta
          name="description"
          content="Dawncaster talents - Browse and search through all Dawncaster talents visualized as skill trees!"
        />

        {/* TODO: Remove this once the skilldex is ready for the public */}
        <meta name="robots" content="noindex, nofollow" />

        <meta property="og:title" content="Dawn-Dash : Skilldex" />
        <meta
          property="og:description"
          content="Dawncaster talents - Browse and search through all Dawncaster talents visualized as skill trees!"
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
