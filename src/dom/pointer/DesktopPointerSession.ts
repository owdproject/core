/**
 * @owdproject/core - Framework-Agnostic W3C Pointer Events Engine
 * High-performance, zero-framework Drag & Resize controller with Pointer Capture,
 * Boundary Clamping, 8-directional Resizing, and IframeGuard integration.
 */

import { IframeGuard } from '../IframeGuard'
import type { DesktopWorkareaRect, WindowBounds, SnapZoneHint } from '../../types'
import { detectSnapZone } from '../../layout/utilDetectSnapZone'

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface DragSessionOptions {
  initialBounds: WindowBounds
  workarea?: DesktopWorkareaRect
  minDistanceToDrag?: number // Threshold in px to prevent accidental drags (default: 3px)
  onStart?: () => void
  onMove?: (bounds: WindowBounds, snapZone: SnapZoneHint | null) => void
  onEnd?: (finalBounds: WindowBounds, snapZone: SnapZoneHint | null) => void
  onCancel?: () => void
}

export interface ResizeSessionOptions {
  direction: ResizeDirection
  initialBounds: WindowBounds
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  workarea?: DesktopWorkareaRect
  onStart?: () => void
  onMove?: (bounds: WindowBounds) => void
  onEnd?: (finalBounds: WindowBounds) => void
  onCancel?: () => void
}

export class DesktopPointerSession {
  /**
   * Starts an agnostic pointer drag operation on any DOM element.
   * Uses setPointerCapture to guarantee smooth tracking even if the cursor leaves the window.
   */
  public static startDrag(event: PointerEvent, options: DragSessionOptions): () => void {
    if (typeof window === 'undefined') return () => {}

    const target = event.currentTarget as HTMLElement | null
    const pointerId = event.pointerId
    const startX = event.clientX
    const startY = event.clientY
    const { initialBounds, workarea, minDistanceToDrag = 3 } = options

    let hasStarted = false
    let currentBounds: WindowBounds = { ...initialBounds }
    let currentSnapZone: SnapZoneHint | null = null

    try {
      target?.setPointerCapture(pointerId)
    } catch {
      // Ignored if target does not support capture
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return

      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      if (!hasStarted) {
        const distance = Math.hypot(deltaX, deltaY)
        if (distance >= minDistanceToDrag) {
          hasStarted = true
          IframeGuard.enable()
          options.onStart?.()
        } else {
          return
        }
      }

      let newX = initialBounds.x + deltaX
      let newY = initialBounds.y + deltaY

      // Optional workarea clamping: prevent dragging titlebar completely off-screen
      if (workarea) {
        const minVisiblePx = 40
        newX = Math.max(workarea.x - initialBounds.width + minVisiblePx, Math.min(newX, workarea.x + workarea.width - minVisiblePx))
        newY = Math.max(workarea.y, Math.min(newY, workarea.y + workarea.height - 30))
      }

      currentBounds = {
        x: Math.round(newX),
        y: Math.round(newY),
        width: initialBounds.width,
        height: initialBounds.height,
      }

      if (workarea) {
        currentSnapZone = detectSnapZone(e.clientX, e.clientY, workarea)
      }

      options.onMove?.(currentBounds, currentSnapZone)
    }

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)

      try {
        if (target?.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId)
        }
      } catch {
        // ignore
      }

      IframeGuard.disable()
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      cleanup()
      if (hasStarted) {
        options.onEnd?.(currentBounds, currentSnapZone)
      }
    }

    const onPointerCancel = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      cleanup()
      if (hasStarted) {
        options.onCancel?.()
      }
    }

    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerCancel, { passive: true })

    return cleanup
  }

  /**
   * Starts an agnostic 8-directional pointer resize operation on any DOM element.
   */
  public static startResize(event: PointerEvent, options: ResizeSessionOptions): () => void {
    if (typeof window === 'undefined') return () => {}

    const target = event.currentTarget as HTMLElement | null
    const pointerId = event.pointerId
    const startX = event.clientX
    const startY = event.clientY
    const {
      direction,
      initialBounds,
      minWidth = 240,
      minHeight = 160,
      maxWidth = 3840,
      maxHeight = 2160,
    } = options

    let currentBounds: WindowBounds = { ...initialBounds }

    try {
      target?.setPointerCapture(pointerId)
    } catch {
      // Ignored if target does not support capture
    }

    IframeGuard.enable()
    options.onStart?.()

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return

      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY

      let { x, y, width, height } = initialBounds

      // Horizontal resizing
      if (direction.includes('e')) {
        width = Math.min(maxWidth, Math.max(minWidth, initialBounds.width + deltaX))
      } else if (direction.includes('w')) {
        const potentialWidth = initialBounds.width - deltaX
        if (potentialWidth >= minWidth && potentialWidth <= maxWidth) {
          width = potentialWidth
          x = initialBounds.x + deltaX
        } else if (potentialWidth < minWidth) {
          width = minWidth
          x = initialBounds.x + (initialBounds.width - minWidth)
        }
      }

      // Vertical resizing
      if (direction.includes('s')) {
        height = Math.min(maxHeight, Math.max(minHeight, initialBounds.height + deltaY))
      } else if (direction.includes('n')) {
        const potentialHeight = initialBounds.height - deltaY
        if (potentialHeight >= minHeight && potentialHeight <= maxHeight) {
          height = potentialHeight
          y = initialBounds.y + deltaY
        } else if (potentialHeight < minHeight) {
          height = minHeight
          y = initialBounds.y + (initialBounds.height - minHeight)
        }
      }

      currentBounds = {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      }

      options.onMove?.(currentBounds)
    }

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)

      try {
        if (target?.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId)
        }
      } catch {
        // ignore
      }

      IframeGuard.disable()
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      cleanup()
      options.onEnd?.(currentBounds)
    }

    const onPointerCancel = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      cleanup()
      options.onCancel?.()
    }

    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerCancel, { passive: true })

    return cleanup
  }
}
