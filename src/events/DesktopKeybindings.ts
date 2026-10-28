/**
 * @owdproject/core - Framework-Agnostic Desktop Keybindings Engine
 * Listens to OS-level shortcuts (Alt+Tab, Super+Arrows, Close, Minimize) and triggers actions.
 */

import type { WindowManager } from '../managers/WindowManager'
import type { DesktopWorkareaRect } from '../types'

export interface KeybindingActionContext {
  event: KeyboardEvent
  windowManager: WindowManager
  workarea?: DesktopWorkareaRect
}

export type KeybindingHandler = (ctx: KeybindingActionContext) => void | boolean

export class DesktopKeybindings {
  private windowManager: WindowManager
  private workareaProvider?: () => DesktopWorkareaRect | undefined
  private customHandlers = new Map<string, KeybindingHandler>()
  private isListening = false
  private listenerRef?: (e: KeyboardEvent) => void

  constructor(
    windowManager: WindowManager,
    options?: { workareaProvider?: () => DesktopWorkareaRect | undefined },
  ) {
    this.windowManager = windowManager
    this.workareaProvider = options?.workareaProvider
  }

  public register(shortcut: string, handler: KeybindingHandler): this {
    this.customHandlers.set(shortcut.toLowerCase(), handler)
    return this
  }

  public listen(): () => void {
    if (typeof window === 'undefined' || this.isListening) {
      return () => this.stop()
    }

    this.isListening = true
    this.listenerRef = (e: KeyboardEvent) => this.handleKeyDown(e)
    window.addEventListener('keydown', this.listenerRef)

    return () => this.stop()
  }

  public stop(): void {
    if (typeof window !== 'undefined' && this.listenerRef) {
      window.removeEventListener('keydown', this.listenerRef)
    }
    this.isListening = false
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Avoid triggering desktop shortcuts when typing inside form inputs
    const activeEl = document.activeElement
    if (
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable)
    ) {
      return
    }

    const isMetaOrCtrl = e.metaKey || e.ctrlKey
    const isAlt = e.altKey
    const isShift = e.shiftKey
    const key = e.key.toLowerCase()

    // 1. Alt+Tab: Cycle Window Focus
    if (isAlt && key === 'tab') {
      e.preventDefault()
      this.cycleWindowFocus(isShift ? 'backward' : 'forward')
      return
    }

    // 2. Super + Arrows: Snap & Maximize
    if (isMetaOrCtrl) {
      const focused = this.windowManager.focusedWindow
      const workarea = this.workareaProvider?.() ?? {
        x: 0,
        y: 0,
        width: typeof window !== 'undefined' ? window.innerWidth : 1920,
        height: typeof window !== 'undefined' ? window.innerHeight : 1080,
      }

      if (key === 'arrowleft' && focused) {
        e.preventDefault()
        this.windowManager.snapWindow(focused.id, 'left-half', workarea)
        return
      }

      if (key === 'arrowright' && focused) {
        e.preventDefault()
        this.windowManager.snapWindow(focused.id, 'right-half', workarea)
        return
      }

      if (key === 'arrowup' && focused) {
        e.preventDefault()
        if (!focused.state.maximized) {
          focused.maximize()
        }
        return
      }

      if (key === 'arrowdown' && focused) {
        e.preventDefault()
        if (focused.state.maximized) {
          focused.unmaximize()
        } else {
          focused.minimize()
        }
        return
      }

      // Super + W: Close focused window
      if (key === 'w' && focused && !e.shiftKey) {
        e.preventDefault()
        this.windowManager.closeWindow(focused.id)
        return
      }
    }
  }

  private cycleWindowFocus(direction: 'forward' | 'backward'): void {
    const activeWindows = Array.from(this.windowManager.getSnapshot()).filter((w) => w.active)
    if (activeWindows.length <= 1) return

    const focusedId = this.windowManager.focusedWindow?.id
    const currentIndex = activeWindows.findIndex((w) => w.id === focusedId)

    let nextIndex = 0
    if (direction === 'forward') {
      nextIndex = (currentIndex + 1) % activeWindows.length
    } else {
      nextIndex = (currentIndex - 1 + activeWindows.length) % activeWindows.length
    }

    const nextWin = activeWindows[nextIndex]
    if (nextWin) {
      this.windowManager.focusWindow(nextWin.id)
    }
  }
}
