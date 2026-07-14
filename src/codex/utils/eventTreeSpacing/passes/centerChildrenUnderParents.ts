import { SpacingContext, TreeNode, getWidth } from '../context'

/**
 * Initial positioning pass: lay out every parent's children in a row centered
 * under it, side by side with the minimum horizontal gap between them.
 *
 * Overlaps between different families are deliberately ignored here — they are
 * fixed later by the overlap-resolution pass.
 */
export const centerChildrenUnderParents = (
  ctx: SpacingContext,
  nodesByDepth: TreeNode[][]
): void => {
  for (let depth = 0; depth < nodesByDepth.length; depth++) {
    const parentsAtDepth = nodesByDepth[depth] || []

    parentsAtDepth.forEach((parent) => {
      if (!parent.children || parent.children.length === 0) return

      // Total width needed for all children with gaps between them
      const childWidths = parent.children.map((child) => getWidth(ctx, child))
      const totalWidth =
        childWidths.reduce((sum, width) => sum + width, 0) +
        (childWidths.length - 1) * ctx.minHorizontalGap

      // Position children centered under parent
      const parentX = parent.x ?? 0
      let currentX = parentX - totalWidth / 2

      parent.children.forEach((child, i) => {
        child.x = currentX + childWidths[i] / 2
        currentX += childWidths[i] + ctx.minHorizontalGap
      })
    })
  }
}
