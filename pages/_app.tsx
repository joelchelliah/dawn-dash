import './app.scss'

import Head from 'next/head'
import Script from 'next/script'

import type { AppProps, NextWebVitalsMetric } from 'next/app'

// Report Web Vitals to Google Analytics
// Next.js automatically calls this function when metrics are measured
export function reportWebVitals(metric: NextWebVitalsMetric) {
  // Send to Google Analytics
  const w = window as typeof window & { gtag?: (...args: unknown[]) => void }
  if (typeof window !== 'undefined' && w.gtag) {
    w.gtag('event', metric.name, {
      event_category: metric.label === 'web-vital' ? 'Web Vitals' : 'Next.js custom metric',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    })
  }
}

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

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Dawn-Dash',
              description:
                'Dawncaster companion tools including speedrun charts, card database, and skill tree visualizer',
              url: 'https://www.dawn-dash.com',
              applicationCategory: 'GameApplication',
              logo: 'https://www.dawn-dash.com/icon-512.png',
            }),
          }}
        />
      </Head>

      {/* Google Analytics */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-461WYVF6D8"
        strategy="afterInteractive"
      />
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
