/**
 * Event tree text measurement: feature-specific font variants on top of the
 * shared tree text measurer.
 *
 * Font configurations (matching the SCSS font-size definitions, assuming 1rem = 16px):
 * - default: 12px (xxs), normal weight (dialogue, effects, requirements, etc.)
 * - choice / special / indicatorHeader: 14px (xs), 600 weight
 *
 * Event dialogue text may contain <br> tags, so `normalizeLineBreakTags` is enabled:
 * by default <br> becomes a space; callers pass `respectLineBreakTags = true` to
 * turn each <br> into an actual line break instead.
 */

import { createTextMeasurer } from './tree/textWidthEstimation'

export type EventFontVariant = 'default' | 'choice' | 'special' | 'indicatorHeader'

const boldVariant = { weight: '600', sizePx: 14, approxCharWidths: { base: 8.2, uppercase: 9.5 } }

const eventTextMeasurer = createTextMeasurer<EventFontVariant>({
  variants: {
    default: { weight: 'normal', sizePx: 12, approxCharWidths: { base: 6.4, uppercase: 8.2 } },
    choice: boldVariant,
    special: boldVariant,
    indicatorHeader: boldVariant,
  },
  approxSpaceWidth: 3,
  normalizeLineBreakTags: true,
})

export const measureEventTextWidth = (
  text: string,
  fontType: EventFontVariant = 'default'
): number => eventTextMeasurer.measureTextWidth(text, fontType)

export const wrapEventText = (
  text: string,
  maxWidth: number,
  fontType: EventFontVariant = 'default',
  respectLineBreakTags = false
): string[] => eventTextMeasurer.wrapText(text, maxWidth, fontType, respectLineBreakTags)
