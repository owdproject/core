/**
 * IframeGuard: prevents embedded <iframe> apps from stealing pointer events
 * during window dragging and resizing across all frameworks.
 */

let activeGuardCount = 0
const originalPointerEventsMap = new WeakMap<HTMLIFrameElement, string>()

export class IframeGuard {
  /**
   * Disables pointer events on all iframes in the document.
   * Safe to call repeatedly; uses reference counting.
   */
  public static enable(selector: string = 'iframe'): void {
    if (typeof document === 'undefined') return

    activeGuardCount++
    if (activeGuardCount === 1) {
      const iframes = document.querySelectorAll<HTMLIFrameElement>(selector)
      iframes.forEach((iframe) => {
        originalPointerEventsMap.set(iframe, iframe.style.pointerEvents)
        iframe.style.pointerEvents = 'none'
      })
    }
  }

  /**
   * Restores pointer events on all iframes once all active operations end.
   */
  public static disable(selector: string = 'iframe'): void {
    if (typeof document === 'undefined') return

    activeGuardCount = Math.max(0, activeGuardCount - 1)
    if (activeGuardCount === 0) {
      const iframes = document.querySelectorAll<HTMLIFrameElement>(selector)
      iframes.forEach((iframe) => {
        const orig = originalPointerEventsMap.get(iframe) ?? ''
        iframe.style.pointerEvents = orig
        originalPointerEventsMap.delete(iframe)
      })
    }
  }

  /**
   * Guard an asynchronous or synchronous action with automatic enable/disable.
   */
  public static async wrap<T>(action: () => Promise<T> | T, selector: string = 'iframe'): Promise<T> {
    IframeGuard.enable(selector)
    try {
      return await action()
    } finally {
      IframeGuard.disable(selector)
    }
  }
}
