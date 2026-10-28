import type {
  DesktopWorkareaRect,
  WindowBounds,
  WindowLayout,
} from '../types'

export type { WindowLayout, WindowBounds, DesktopWorkareaRect }

export function workareaBottom(workarea: DesktopWorkareaRect): number {
  return workarea.y + workarea.height
}

export function workareaRight(workarea: DesktopWorkareaRect): number {
  return workarea.x + workarea.width
}

/**
 * Pure math: Viewport rectangle for a snap zone inside the shell work area.
 */
export function computeSnapRect(
  zone: Exclude<WindowLayout, 'normal'>,
  workarea: DesktopWorkareaRect,
): WindowBounds {
  const { x, y, width, height } = workarea
  const halfW = Math.floor(width / 2)
  const halfH = Math.floor(height / 2)

  switch (zone) {
    case 'maximize':
      return { x, y, width, height }
    case 'left-half':
      return { x, y, width: halfW, height }
    case 'right-half':
      return { x: x + halfW, y, width: width - halfW, height }
    case 'bottom-half':
      return { x, y: y + halfH, width, height: height - halfH }
    case 'top-left':
      return { x, y, width: halfW, height: halfH }
    case 'top-right':
      return { x: x + halfW, y, width: width - halfW, height: halfH }
    case 'bottom-left':
      return { x, y: y + halfH, width: halfW, height: height - halfH }
    case 'bottom-right':
      return {
        x: x + halfW,
        y: y + halfH,
        width: width - halfW,
        height: height - halfH,
      }
    default: {
      const _exhaustive: never = zone
      return _exhaustive
    }
  }
}
