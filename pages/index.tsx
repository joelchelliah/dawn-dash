import Head from 'next/head'
import dynamic from 'next/dynamic'

const Speedruns = dynamic(() => import('../src/speedruns'), {
  loading: () => <div>Loading speedrun charts...</div>,
})

export default function SpeedrunsPage() {
  return (
    <>
      <Head>
        <title>Dawn-Dash : Speedruns</title>
        <meta name="description" content="Dawncaster speedrun charts, records and more!" />
        <link rel="canonical" href="https://www.dawn-dash.com/" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Dawn-Dash : Speedruns" />
        <meta property="og:description" content="Dawncaster speedrun charts, records and more!" />
        <meta property="og:image" content="https://www.dawn-dash.com/og-image-dawndash.png" />
        <meta property="og:url" content="https://www.dawn-dash.com" />

        {/* The url shown in Discord */}
        <meta property="og:site_name" content="dawn-dash.com" />

        <meta property="twitter:image" content="https://www.dawn-dash.com/og-image-dawndash.png" />
      </Head>
      <Speedruns />
    </>
  )
}
