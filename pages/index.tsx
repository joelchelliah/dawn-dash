import Head from 'next/head'

import Speedruns from '../src/pages/Speedruns'

export default function SpeedrunsPage() {
  return (
    <>
      <Head>
        <title>Dawn-Dash : Speedruns</title>
        <meta name="description" content="Dawncaster speedrun charts, records and more!" />
        <meta property="og:title" content="Dawn-Dash : Speedruns" />
        <meta property="og:description" content="Dawncaster speedrun charts, records and more!" />
        <meta property="og:image" content="https://www.dawn-dash.com/og-image-dawndash.png" />
        <meta property="og:url" content="https://www.dawn-dash.com" />

        {/* The url shown in Discord */}
        <meta property="og:site_name" content="dawn-dash.com" />

        {/* Allow the large images in Discord */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta property="twitter:image" content="https://www.dawn-dash.com/og-image-dawndash.png" />
      </Head>
      <Speedruns />
    </>
  )
}
