import { useEffect } from 'react'

import Head from 'next/head'
import Image from 'next/image'
import { useRouter } from 'next/router'

import { SPEEDRUNS_URL_PARAMS } from '@/speedruns/constants/chartControlValues'

import { createCx } from '../src/shared/utils/classnames'
import GradientLink from '../src/shared/components/GradientLink'
import { DashImageUrl } from '../src/shared/utils/imageUrls'

import styles from './index.module.scss'

const cx = createCx(styles)

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    if (router.isReady) {
      const hasWhitelistedParams = SPEEDRUNS_URL_PARAMS.some((param) => param in router.query)

      if (hasWhitelistedParams) {
        router.replace({
          pathname: '/speedruns',
          query: router.query,
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query])

  const isDev = process.env.NODE_ENV === 'development'

  const title = 'Dawn-Dash'
  const description =
    'Dawncaster tools and resources, including interactive codexes for cards and talents, event-tree visualizer, and speedrun charts!'
  const ogDescription =
    'Useful tools for Dawncaster, including advanced cards/talents search, event-tree visualizer, and speedrun charts!'
  const image = 'https://www.dawn-dash.com/og-image-dawndash.png'
  const url = 'https://www.dawn-dash.com'
  const squareLogo = 'https://www.dawn-dash.com/logo-dawndash.png'
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={image} />
        <meta property="og:url" content={url} />

        {/* The url shown in Discord */}
        <meta property="og:site_name" content="dawn-dash.com" />

        <meta property="twitter:image" content={image} />

        {/* Page-Specific Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: title,
              description,
              url,
              image: squareLogo,
            }),
          }}
        />
      </Head>
      <div className={cx('container')}>
        <Image
          src={DashImageUrl}
          alt="Dawn-Dash logo"
          className={cx('logo')}
          width={120}
          height={120}
        />
        <h1 className={cx('title')}>Dawn-Dash</h1>
        <p className={cx('description')}>
          A collection of Dawncaster tools and resources, including interactive codexes for cards and
          talents, event-tree visualizer, and speedrun charts!
        </p>
        <nav className={cx('nav')}>
          <GradientLink text="Speedruns" url="/speedruns" internal />
          <GradientLink text="Cardex" url="/cardex" internal />
          <GradientLink text="Skilldex" url="/skilldex" internal />
          {isDev && <GradientLink text="Eventmaps" url="/eventmaps" internal />}
        </nav>
      </div>
    </>
  )
}
