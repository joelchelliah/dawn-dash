import '../styles/index.scss'

import Head from 'next/head'
import Script from 'next/script'

import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow, max-image-preview:large" />

        {/* Discord stripe color */}
        <meta name="theme-color" content="#249624" />

        {/* Allow the large images in Discord */}
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      {/* Google Analytics */}
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-461WYVF6D8');
        `}
      </Script>

      <Component {...pageProps} />
    </>
  )
}
