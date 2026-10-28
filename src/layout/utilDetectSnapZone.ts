import type { DesktopWorkareaRect, WindowLayout } from '../types'
import { workareaBottom, workareaRight } from './utilWindowLayout'

export type SnapZoneHint = Exclude<WindowLayout, 'normal'>

export const WINDOW_SNAP_EDGE_PX = 24
export const WORKSPACE_EDGE_DROP_PX = 32

export type DetectSnapZoneOptions = {
  edgePx?: number
  /** When true, left/right half snap is suppressed in the outer workspace-edge band. */
  deferSideSnapForWorkspaceEdge?: boolean
}

/**
 * Pure math: Resolve snap zone from pointer position and shell work area.
 * Returns null when the pointer is not in a snap band.
 */
export function detectSnapZone(
  clientX: number,
  clientY: number,
  workarea: DesktopWorkareaRect,
  options?: DetectSnapZoneOptions,
): SnapZoneHint | null {
  const edge = options?.edgePx ?? WINDOW_SNAP_EDGE_PX
  const { x, y, width, height } = workarea

  if (width <= 0 || height <= 0) {
    return null
  }

  const bottom = workareaBottom(workarea)
  const right = workareaRight(workarea)

  const nearTop = clientY <= y + edge
  const nearBottom = clientY >= bottom - edge
  const nearLeft = clientX <= x + edge
  const nearRight = clientX >= right - edge

  const inWorkspaceEdgeBand =
    options?.deferSideSnapForWorkspaceEdge === true &&
    typeof globalThis !== 'undefined' &&
    'innerWidth' in globalThis &&
    (clientX <= WORKSPACE_EDGE_DROP_PX ||
      clientX >= (globalThis as any).innerWidth - WORKSPACE_EDGE_DROP_PX)

  if (nearTop && nearLeft) return 'top-left'
  if (nearTop && nearRight) return 'top-right'
  if (nearBottom && nearLeft) return 'bottom-left'
  if (nearBottom && nearRight) return 'bottom-right'
  if (nearTop) return 'maximize'
  if (nearBottom) return 'bottom-half'
  if (nearLeft && !inWorkspaceEdgeBand) return 'left-half'
  if (nearRight && !inWorkspaceEdgeBand) return 'right-half'

  return null
}
