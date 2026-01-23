import NextImage, { ImageProps as NextImageProps } from 'next/image'

interface ImageProps extends NextImageProps {
  optimized?: boolean
}

export default function Image({ optimized, ...props }: ImageProps) {
  return <NextImage {...props} unoptimized={!optimized} />
}
