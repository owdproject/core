import type { DesktopWorkAreaRect, WindowConfig } from '@owdproject/core'
import { EMPTY_DESKTOP_WORK_AREA } from '../stores/storeDesktopWindow'

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

export function resolveDesktopWorkArea(
  workArea: DesktopWorkAreaRect = EMPTY_DESKTOP_WORK_AREA,
): DesktopWorkAreaRect {
  if (workArea.width > 0 && workArea.height > 0) {
    return workArea
  }

  if (typeof globalThis === 'undefined' || !('innerWidth' in globalThis)) {
    return workArea
  }

  return {
    x: 0,
    y: 0,
    width: globalThis.innerWidth,
    height: globalThis.innerHeight,
  }
}

export function computeCenteredPosition(
  workArea: DesktopWorkAreaRect,
  windowWidth: number,
  windowHeight: number,
): { x: number; y: number } {
  return {
    x: workArea.x + (workArea.width - windowWidth) / 2,
    y: workArea.y + (workArea.height - windowHeight) / 2,
  }
}

export function resolveInitialWindowPosition(options: {
  windowConfig: WindowConfig
  workArea?: DesktopWorkAreaRect
  cascadeOffset?: number
}): { x: number; y: number } {
  const { windowConfig, cascadeOffset = 0 } = options
  const workArea = resolveDesktopWorkArea(options.workArea)
  const layoutWidth = parseWindowConfigSize(windowConfig.size?.width, 400)
  const layoutHeight = parseWindowConfigSize(windowConfig.size?.height, 240)
  const hasExplicitPosition =
    windowConfig.position?.x !== undefined ||
    windowConfig.position?.y !== undefined

  if (!hasExplicitPosition) {
    const { x, y } = computeCenteredPosition(workArea, layoutWidth, layoutHeight)
    return { x: x + cascadeOffset, y: y + cascadeOffset }
  }

  const scrollY =
    typeof globalThis !== 'undefined' && 'scrollY' in globalThis
      ? globalThis.scrollY
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
