/**
 * Maps event type numbers to human-readable names
 */
export const eventTypeMapper = (type: number): string => {
  switch (type) {
    case 0:
      return '💁‍♂️ NPC-related events'
    case 2:
      return '🎯 Opportunities (mostly)'
    case 10:
      return '⛩️ Shrines'
    default:
      return '📖 Story-related or special events'
  }
}
