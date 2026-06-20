import type { DesktopWorkAreaRect, IWindowController } from '@owdproject/core'
import {
  EMPTY_DESKTOP_WORK_AREA,
  useDesktopWindowStore,
} from '../stores/storeDesktopWindow'

export const OWD_WINDOW_ID_ATTR = 'data-owd-window-id'

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

export function findWindowElement(windowId: string): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null
  }

  return document.querySelector<HTMLElement>(
    `[${OWD_WINDOW_ID_ATTR}="${windowId}"]`,
  )
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

export function centerWindowInWorkArea(
  win: IWindowController,
  workArea?: DesktopWorkAreaRect,
): boolean {
  const el = findWindowElement(win.state.id)
  if (!el) {
    return false
  }

  const { width, height } = el.getBoundingClientRect()
  if (width <= 0 || height <= 0) {
    return false
  }

  const area = resolveDesktopWorkArea(workArea)
  if (area.width <= 0 || area.height <= 0) {
    return false
  }

  const { x, y } = computeCenteredPosition(area, width, height)
  win.actions.setPosition({ x, y })
  return true
}

export async function centerWindowWhenReady(
  win: IWindowController,
  maxAttempts = 80,
  intervalMs = 50,
): Promise<boolean> {
  const desktopWindowStore = useDesktopWindowStore()

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => resolve())
      } else {
        resolve()
      }
    })

    if (centerWindowInWorkArea(win, desktopWindowStore.workArea)) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
      await new Promise<void>((resolve) => {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => resolve())
        } else {
          resolve()
        }
      })
      centerWindowInWorkArea(win, desktopWindowStore.workArea)
      return true
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  return false
}
