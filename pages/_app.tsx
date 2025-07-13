import '../styles/index.scss'

import Head from 'next/head'

import ServiceWorkerRegistration from '../components/serviceWorkerRegistration'

import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <ServiceWorkerRegistration />
      <Component {...pageProps} />
    </>
  )
}
