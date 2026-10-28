import type { DesktopWorkareaRect, WindowConfig } from '../types'

export const EMPTY_DESKTOP_WORKAREA: DesktopWorkareaRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
}

export function parseWindowConfigSize(
  value: number | string | undefined,
  fallback: number,
): number {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return fallback
}

export function resolveDesktopWorkarea(
  workarea: DesktopWorkareaRect = EMPTY_DESKTOP_WORKAREA,
): DesktopWorkareaRect {
  if (workarea.width > 0 && workarea.height > 0) {
    return workarea
  }

  if (typeof globalThis === 'undefined' || !('innerWidth' in globalThis)) {
    return workarea
  }

  return {
    x: 0,
    y: 0,
    width: (globalThis as any).innerWidth,
    height: (globalThis as any).innerHeight,
  }
}

export function computeCenteredPosition(
  workarea: DesktopWorkareaRect,
  windowWidth: number,
  windowHeight: number,
): { x: number; y: number } {
  return {
    x: workarea.x + (workarea.width - windowWidth) / 2,
    y: workarea.y + (workarea.height - windowHeight) / 2,
  }
}

export function resolveInitialWindowPosition(options: {
  windowConfig: WindowConfig
  workarea?: DesktopWorkareaRect
  cascadeOffset?: number
}): { x: number; y: number } {
  const { windowConfig, cascadeOffset = 0 } = options
  const workarea = resolveDesktopWorkarea(options.workarea)
  const layoutWidth = parseWindowConfigSize(windowConfig.size?.width, 400)
  const layoutHeight = parseWindowConfigSize(windowConfig.size?.height, 240)
  const hasExplicitPosition =
    windowConfig.position?.x !== undefined ||
    windowConfig.position?.y !== undefined

  if (!hasExplicitPosition) {
    const { x, y } = computeCenteredPosition(workarea, layoutWidth, layoutHeight)
    return { x: x + cascadeOffset, y: y + cascadeOffset }
  }

  const scrollY =
    typeof globalThis !== 'undefined' && 'scrollY' in globalThis
      ? (globalThis as any).scrollY
      : 0
  const baseX = windowConfig.position?.x ?? 0
  const baseY =
    windowConfig.position?.y !== undefined
      ? scrollY + windowConfig.position.y
      : scrollY

  return {
    x: baseX + cascadeOffset,
    y: baseY + cascadeOffset,
  }
}
