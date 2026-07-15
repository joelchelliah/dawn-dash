export interface BaseButtonProps {
  children: React.ReactNode
  onClick: () => void
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
  ariaLabel?: string
}
