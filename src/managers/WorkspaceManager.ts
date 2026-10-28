import type { Hookable } from 'hookable'
import type { DesktopRuntimeHooks, DesktopWorkareaRect } from '../types'
import { globalDesktopHooks } from '../events/DesktopHooks'
import { CoreIPCBus, globalIPCBus } from '../events/IPC'

export interface WorkspaceState {
  readonly workspaces: readonly string[]
  readonly active: string
  readonly workarea: DesktopWorkareaRect
}

export class WorkspaceManager {
  private state: WorkspaceState
  private subscribers = new Set<(state: WorkspaceState) => void>()
  private hooks: Hookable<DesktopRuntimeHooks>
  private ipc: CoreIPCBus

  constructor(options?: {
    workspaces?: string[]
    active?: string
    workarea?: DesktopWorkareaRect
    hooks?: Hookable<DesktopRuntimeHooks>
    ipc?: CoreIPCBus
  }) {
    this.hooks = options?.hooks ?? globalDesktopHooks
    this.ipc = options?.ipc ?? globalIPCBus
    this.state = Object.freeze({
      workspaces: Object.freeze([...(options?.workspaces ?? ['workspace-1', 'workspace-2', 'workspace-3', 'workspace-4'])]),
      active: options?.active ?? 'workspace-1',
      workarea: Object.freeze({ ...(options?.workarea ?? { x: 0, y: 0, width: 0, height: 0 }) }),
    })
  }

  private updateState(patch: Partial<{ workspaces: string[]; active: string; workarea: DesktopWorkareaRect }>): void {
    this.state = Object.freeze({
      workspaces: patch.workspaces ? Object.freeze([...patch.workspaces]) : this.state.workspaces,
      active: patch.active ?? this.state.active,
      workarea: patch.workarea ? Object.freeze({ ...patch.workarea }) : this.state.workarea,
    })
    this.notify()
  }

  public getSnapshot(): WorkspaceState {
    return this.state
  }

  public subscribe(callback: (state: WorkspaceState) => void): () => void {
    this.subscribers.add(callback)
    callback(this.state)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  private notify() {
    for (const sub of this.subscribers) {
      try {
        sub(this.state)
      } catch {
        // ignore
      }
    }
  }

  public get activeWorkspace(): string {
    return this.state.active
  }

  public get workspaces(): string[] {
    return [...this.state.workspaces]
  }

  public get workarea(): DesktopWorkareaRect {
    return { ...this.state.workarea }
  }

  public async setWorkspace(workspaceId: string): Promise<boolean> {
    if (!this.state.workspaces.includes(workspaceId)) {
      return false
    }

    const previous = this.state.active
    if (previous === workspaceId) return true

    const switchCtx = { from: previous, to: workspaceId, cancel: false }
    await this.hooks.callHook('workspace:before-switch', switchCtx)
    if (switchCtx.cancel) return false

    this.updateState({ active: workspaceId })

    await this.hooks.callHook('workspace:switched', { from: previous, to: workspaceId })
    this.ipc.emit('workspace:switched', { from: previous, to: workspaceId }, { source: 'workspace-manager' })

    return true
  }

  public setWorkarea(workarea: DesktopWorkareaRect): void {
    this.updateState({ workarea })
  }

  public addWorkspace(id: string): void {
    if (!this.state.workspaces.includes(id)) {
      this.updateState({ workspaces: [...this.state.workspaces, id] })
    }
  }

  public removeWorkspace(id: string): boolean {
    if (this.state.workspaces.length <= 1 || !this.state.workspaces.includes(id)) {
      return false
    }

    const nextWorkspaces = this.state.workspaces.filter((w) => w !== id)
    const nextActive = this.state.active === id ? nextWorkspaces[0]! : this.state.active
    this.updateState({ workspaces: nextWorkspaces, active: nextActive })
    return true
  }
}
