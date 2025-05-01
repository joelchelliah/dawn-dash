import classNames from 'classnames/bind'

export const createCx = (styles: Record<string, string>) => classNames.bind(styles)
