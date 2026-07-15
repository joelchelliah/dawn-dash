import React, { Component, ErrorInfo, ReactNode } from 'react'

import { track } from '@vercel/analytics'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'
import { DantelionImageUrl } from '@/shared/utils/imageUrls'
import { logger } from '@/shared/utils/logger'

import GradientButton from '../Buttons/GradientButton'

import styles from './index.module.scss'

interface Props {
  children: ReactNode
  componentName: string
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

const cx = createCx(styles)

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo)

    try {
      track('error-boundary', {
        component: this.props.componentName,
        error: `${error.name}: ${error.message}`,
      })
    } catch {
      // Reporting must never crash the boundary itself
    }

    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className={cx('error-container')}>
          <h3>Yikes!</h3>
          <p>
            Something crashed in the <strong>{this.props.componentName}</strong> component. Try
            reloading, or give it some time...
          </p>
          <Image
            src={DantelionImageUrl}
            alt="Dantelion image"
            className={cx('image')}
            width={80}
            height={80}
          />
          <GradientButton
            className={cx('retry-button')}
            onClick={() => this.setState({ hasError: false, error: undefined })}
            bold
          >
            Try Again
          </GradientButton>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
