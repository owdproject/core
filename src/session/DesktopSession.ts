/**
 * @owdproject/core - Desktop Session Serializer & Hydration Engine
 * Allows full state capture, persistence (LocalStorage / Database), and instant restore
 * across sessions, devices, and frameworks.
 */

import type { WindowManager } from '../managers/WindowManager'
import type { WindowState } from '../types'

export interface DesktopSerializedWindow {
  id: string
  model: string
  workspace: string
  title?: string
  position?: { x?: number; y?: number; z?: number }
  size?: { width?: any; height?: any }
  maximized?: boolean
  layout?: any
  spatial?: any
  focused?: boolean
  meta?: Record<string, any>
}

export interface DesktopSerializedSession {
  version: number
  timestamp: number
  activeWorkspace?: string
  windows: DesktopSerializedWindow[]
}

export class DesktopSessionManager {
  public static readonly CURRENT_VERSION = 1

  /**
   * Serializes current WindowManager state into a JSON-compatible object.
   */
  public static serialize(
    windowManager: WindowManager,
    options?: { activeWorkspace?: string },
  ): DesktopSerializedSession {
    const windows = windowManager.getSnapshot()

    const serializedWindows: DesktopSerializedWindow[] = windows
      .filter((win) => win.state.active)
      .map((win) => {
        return {
          id: win.id,
          model: win.model ?? 'window',
          workspace: win.state.workspace,
          title: win.config.title,
          position: win.state.position,
          size: win.state.size,
          maximized: win.state.maximized,
          layout: win.state.layout,
          spatial: win.state.spatial,
          focused: win.state.focused,
        }
      })

    return {
      version: DesktopSessionManager.CURRENT_VERSION,
      timestamp: Date.now(),
      activeWorkspace: options?.activeWorkspace,
      windows: serializedWindows,
    }
  }

  /**
   * Restores windows from a serialized session into a WindowManager instance.
   */
  public static restore(
    windowManager: WindowManager,
    session: DesktopSerializedSession,
    options?: { componentResolver?: (model: string) => any },
  ): { restoredCount: number; errors: string[] } {
    const errors: string[] = []
    let restoredCount = 0

    if (!session || typeof session !== 'object' || !Array.isArray(session.windows)) {
      return { restoredCount: 0, errors: ['Invalid session format'] }
    }

    for (const item of session.windows) {
      try {
        const component = options?.componentResolver?.(item.model)
        windowManager.createWindow({
          id: item.id,
          model: item.model,
          config: {
            title: item.title,
            component,
          },
          initialState: {
            workspace: item.workspace,
            position: item.position,
            size: item.size ?? { width: 640, height: 480 },
            maximized: item.maximized,
            spatial: item.spatial,
          },
        })
        restoredCount++
      } catch (err: any) {
        errors.push(`Failed to restore window ${item.id}: ${err?.message || String(err)}`)
      }
    }

    return { restoredCount, errors }
  }
}
