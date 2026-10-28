import type { Hookable } from 'hookable'
import type {
  DesktopCommand,
  DesktopKernelEvent,
  DesktopRuntimeHooks,
  DesktopWorkareaRect,
} from './types'
import { WindowManager, type WindowInstance } from './managers/WindowManager'
import { WorkspaceManager, type WorkspaceState } from './managers/WorkspaceManager'
import { ApplicationManager, type ApplicationInstance } from './managers/ApplicationManager'
import { createDesktopHooks } from './events/DesktopHooks'
import { CoreIPCBus } from './events/IPC'
import { DesktopCommands } from './events/DesktopCommands'
import { DesktopKeybindings } from './events/DesktopKeybindings'
import { DesktopSessionManager, type DesktopSerializedSession } from './session/DesktopSession'

export interface DesktopOptions {
  workspaces?: string[]
  activeWorkspace?: string
  workarea?: DesktopWorkareaRect
  maxIpcEvents?: number
}

export interface DesktopSnapshot {
  readonly windows: readonly WindowInstance[]
  readonly applications: readonly ApplicationInstance[]
  readonly workspace: WorkspaceState
  readonly commands: readonly DesktopCommand[]
  readonly events: readonly DesktopKernelEvent[]
}

/**
 * Unified, framework-independent Desktop instance.
 * Encapsulates WindowManager, ApplicationManager, WorkspaceManager, DesktopCommands,
 * Hookable lifecycle hooks, IPC event bus, session persistence, and service registry.
 */
export class Desktop {
  public readonly hooks: Hookable<DesktopRuntimeHooks>
  public readonly ipc: CoreIPCBus
  public readonly windows: WindowManager
  public readonly workspaces: WorkspaceManager
  public readonly applications: ApplicationManager
  public readonly commands: DesktopCommands
  public readonly keybindings: DesktopKeybindings

  private serviceRegistry = new Map<string, any>()
  private snapshotCache: DesktopSnapshot
  private subscribers = new Set<(snapshot: DesktopSnapshot) => void>()

  constructor(options?: DesktopOptions) {
    this.hooks = createDesktopHooks()
    this.ipc = new CoreIPCBus({ maxEvents: options?.maxIpcEvents ?? 150 })

    this.workspaces = new WorkspaceManager({
      workspaces: options?.workspaces,
      active: options?.activeWorkspace,
      workarea: options?.workarea,
      hooks: this.hooks,
      ipc: this.ipc,
    })

    this.windows = new WindowManager({
      hooks: this.hooks,
      ipc: this.ipc,
    })

    this.applications = new ApplicationManager({
      windowManager: this.windows,
      workspaceManager: this.workspaces,
      hooks: this.hooks,
      ipc: this.ipc,
    })

    this.commands = new DesktopCommands({
      hooks: this.hooks,
      ipc: this.ipc,
    })

    this.keybindings = new DesktopKeybindings(this.windows)

    this.snapshotCache = this.buildSnapshot()

    const refresh = () => {
      this.snapshotCache = this.buildSnapshot()
      for (const sub of this.subscribers) {
        try {
          sub(this.snapshotCache)
        } catch {
          // ignore
        }
      }
    }

    this.windows.subscribe(refresh)
    this.applications.subscribe(refresh)
    this.workspaces.subscribe(refresh)
    this.commands.subscribe(refresh)
    this.ipc.subscribe(refresh)
  }

  private buildSnapshot(): DesktopSnapshot {
    return Object.freeze({
      windows: this.windows.getSnapshot(),
      applications: this.applications.getSnapshot(),
      workspace: this.workspaces.getSnapshot(),
      commands: this.commands.getSnapshot(),
      events: Object.freeze([...this.ipc.getEvents()]),
    })
  }

  public getSnapshot(): DesktopSnapshot {
    return this.snapshotCache
  }

  public subscribe(callback: (snapshot: DesktopSnapshot) => void): () => void {
    this.subscribers.add(callback)
    callback(this.snapshotCache)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  public readonly session = {
    serialize: (): DesktopSerializedSession =>
      DesktopSessionManager.serialize(this.windows, {
        activeWorkspace: this.workspaces.activeWorkspace,
      }),
    restore: (
      sessionData: DesktopSerializedSession,
      options?: { componentResolver?: (model: string) => any },
    ) => {
      if (sessionData.activeWorkspace) {
        void this.workspaces.setWorkspace(sessionData.activeWorkspace)
      }
      return DesktopSessionManager.restore(this.windows, sessionData, options)
    },
  }

  public readonly services = {
    provide: <T>(name: string, service: T): void => {
      this.serviceRegistry.set(name, service)
    },
    inject: <T = any>(name: string): T | undefined => {
      return this.serviceRegistry.get(name) as T | undefined
    },
    has: (name: string): boolean => {
      return this.serviceRegistry.has(name)
    },
  }
}

/**
 * Primary factory to create an isolated, headless Desktop instance.
 */
export function createDesktop(options?: DesktopOptions): Desktop {
  return new Desktop(options)
}

export const createDesktopKernel = createDesktop
export type DesktopKernel = Desktop
