import { GetStaticProps, GetStaticPaths } from 'next'

import { BootyPageProps } from '@/codex/BootyPage'
import { findBootyCardByUrlParam, getBootyCardUrlParams } from '@/codex/utils/bootyCardUrl'

/**
 * Static route handler for `/booty/[card]`
 * Handles URLs like `/booty/flying_carpet`, which load Booty with that card's modal already open.
 * The card name in the URL is lowercase with spaces replaced by underscores.
 *
 * The page itself is `BootyPage`, exported directly rather than wrapped so that this route and
 * `/booty` are the same component type.
 */
export { default } from '@/codex/BootyPage'

/**
 * Generates a path per treasure and special weapon at build time.
 */
export const getStaticPaths: GetStaticPaths = async () => {
  const paths = getBootyCardUrlParams().map((card) => ({ params: { card } }))

  return {
    paths,
    fallback: false, // Return 404 for any path not returned by getStaticPaths
  }
}

/**
 * Resolves the param to its card at build time, for the `<Head>` only.
 */
export const getStaticProps: GetStaticProps<BootyPageProps> = async (context) => {
  const cardParam = context.params?.card as string | undefined

  if (!cardParam) {
    return { props: { card: null, cardUrlParam: '' } }
  }

  return {
    props: {
      card: findBootyCardByUrlParam(cardParam),
      cardUrlParam: cardParam,
    },
  }
}
