import { createActor, type ActorRefFrom } from 'xstate'
import type { Hookable } from 'hookable'
import { applicationMachine } from '../machines/machineApplication'
import type {
  ApplicationConfig,
  ApplicationPermission,
  DesktopRuntimeHooks,
  WindowConfig,
  WindowState,
} from '../types'
import { WindowManager, type WindowInstance } from './WindowManager'
import { WorkspaceManager } from './WorkspaceManager'
import { globalDesktopHooks } from '../events/DesktopHooks'
import { CoreIPCBus, globalIPCBus } from '../events/IPC'

export interface ApplicationProcessSnapshot {
  readonly id: string
  readonly title: string
  readonly icon?: string
  readonly category?: string
  readonly stateValue: string
  readonly pid: number | null
  readonly startedAt: number | null
  readonly isRunning: boolean
  readonly isSuspended: boolean
  readonly windowIds: readonly string[]
}

function formatAppSnapshotValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length > 0) {
      const [k, v] = entries[0]!
      return `${k}.${formatAppSnapshotValue(v)}`
    }
  }
  return 'idle'
}

export class ApplicationInstance {
  public readonly id: string
  public readonly config: ApplicationConfig
  private actor: ActorRefFrom<typeof applicationMachine>
  private _pid: number | null = null
  private _startedAt: number | null = null
  private _windowIds = new Set<string>()
  private snapshot: ApplicationProcessSnapshot
  private subscribers = new Set<(snapshot: ApplicationProcessSnapshot) => void>()

  private windowManager: WindowManager
  private workspaceManager?: WorkspaceManager
  private hooks: Hookable<DesktopRuntimeHooks>
  private ipc: CoreIPCBus
  private allocatePid: () => number

  constructor(options: {
    config: ApplicationConfig
    windowManager: WindowManager
    workspaceManager?: WorkspaceManager
    hooks?: Hookable<DesktopRuntimeHooks>
    ipc?: CoreIPCBus
    allocatePid: () => number
  }) {
    this.id = options.config.id
    this.config = { ...options.config }
    this.windowManager = options.windowManager
    this.workspaceManager = options.workspaceManager
    this.hooks = options.hooks ?? globalDesktopHooks
    this.ipc = options.ipc ?? globalIPCBus
    this.allocatePid = options.allocatePid

    this.actor = createActor(applicationMachine, {
      input: { id: this.id, config: this.config },
    })

    this.snapshot = this.computeSnapshot('idle')

    this.actor.subscribe((stateSnapshot: any) => {
      const stateVal = formatAppSnapshotValue(stateSnapshot.value)
      if (stateVal === 'terminating') {
        this._pid = null
        this._startedAt = null
        this.actor.send({ type: 'TERMINATED' })
        return
      }
      this.snapshot = this.computeSnapshot(stateVal)
      this.notify()
    })

    this.actor.start()
    this.actor.send({ type: 'LAUNCH' })
    this.actor.send({ type: 'INITIALIZED' })
  }

  private computeSnapshot(stateValue?: string): ApplicationProcessSnapshot {
    const currentVal = stateValue ?? formatAppSnapshotValue(this.actor.getSnapshot().value)
    return Object.freeze({
      id: this.id,
      title: this.config.title,
      icon: this.config.icon,
      category: this.config.category,
      stateValue: currentVal,
      pid: this._pid,
      startedAt: this._startedAt,
      isRunning: currentVal.startsWith('running'),
      isSuspended: currentVal === 'running.suspended',
      windowIds: Object.freeze(Array.from(this._windowIds)),
    })
  }

  private refreshSnapshot(): void {
    this.snapshot = this.computeSnapshot()
    this.notify()
  }

  private notify(): void {
    for (const sub of this.subscribers) {
      try {
        sub(this.snapshot)
      } catch {
        // ignore
      }
    }
  }

  public getSnapshot(): ApplicationProcessSnapshot {
    return this.snapshot
  }

  public subscribe(callback: (snapshot: ApplicationProcessSnapshot) => void): () => void {
    this.subscribers.add(callback)
    callback(this.snapshot)
    return () => {
      this.subscribers.delete(callback)
    }
  }

  public get pid(): number | null {
    return this._pid
  }

  public get startedAt(): number | null {
    return this._startedAt
  }

  public get stateValue(): string {
    return this.snapshot.stateValue
  }

  public get isRunning(): boolean {
    return this.snapshot.isRunning
  }

  public get isSuspended(): boolean {
    return this.snapshot.isSuspended
  }

  public hasPermission(permission: ApplicationPermission): boolean {
    if (!this.config.permissions) return true
    return this.config.permissions.includes(permission)
  }

  private ensureProcessStarted(): void {
    if (this._pid === null) {
      this._pid = this.allocatePid()
      this._startedAt = Date.now()
    }
  }

  public async launch(entryKey?: string, argument?: string): Promise<boolean> {
    const entries = this.config.entries ?? {}
    const resolvedKey = entryKey ?? Object.keys(entries)[0]
    const entry = resolvedKey ? entries[resolvedKey] : undefined

    const launchCtx = { app: this, entryKey: resolvedKey, argument, cancel: false }
    await this.hooks.callHook('app:before-launch', launchCtx)
    if (launchCtx.cancel) return false

    this.ensureProcessStarted()
    this.actor.send({ type: 'LAUNCH' })

    if (entry) {
      if (typeof entry.command === 'function') {
        await entry.command(this, argument)
      } else if (typeof entry.command === 'string' && this.config.commands) {
        const parts = entry.command.trim().split(/\s+/)
        const cmdName = parts[0]
        const fn = cmdName ? this.config.commands[cmdName] : undefined
        if (fn) {
          await fn(this, argument ?? parts.slice(1).join(' '))
        }
      }
    } else if (this.config.windows) {
      const firstModel = Object.keys(this.config.windows)[0]
      if (firstModel) {
        await this.openWindow(firstModel)
      }
    }

    await this. config.onLaunch?.(this)
    this.refreshSnapshot()

    await this.hooks.callHook('app:launched', { app: this, pid: this._pid })
    this.ipc.emit('app:launched', { id: this.id, pid: this._pid }, { source: this.id })
    return true
  }

  public async openWindow(
    model: string,
    meta?: Record<string, any>,
    initialState?: Partial<WindowState>,
  ): Promise<WindowInstance | undefined> {
    const windowConfig: WindowConfig | undefined = this.config.windows?.[model] ?? {
      title: this.config.title,
      icon: this.config.icon,
      category: this.config.category,
      size: { width: 640, height: 480 },
    }

    if (this.config.singleton && this._windowIds.size > 0) {
      const existingId = Array.from(this._windowIds)[0]!
      const existingWin = this.windowManager.get(existingId)
      if (existingWin) {
        existingWin.unminimize()
        this.windowManager.focusWindow(existingWin.id)
        return existingWin
      }
    }

    const openCtx = {
      app: this,
      model,
      config: windowConfig,
      meta,
      cancel: false,
    }
    await this.hooks.callHook('window:before-open', openCtx)
    if (openCtx.cancel) return undefined

    this.ensureProcessStarted()
    const winId = `${this.id}-${model}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const workspace =
      initialState?.workspace ?? this.workspaceManager?.activeWorkspace ?? 'workspace-1'

    const instance = this.windowManager.createWindow({
      id: winId,
      model,
      applicationId: this.id,
      config: {
        ...windowConfig,
        title: windowConfig.title ?? this.config.title,
        icon: windowConfig.icon ?? this.config.icon,
        category: windowConfig.category ?? this.config.category,
      },
      initialState,
      meta,
      workspace,
    })

    this._windowIds.add(instance.id)
    this.actor.send({ type: 'OPEN_WINDOW' })
    this.refreshSnapshot()

    await this.hooks.callHook('window:opened', { window: instance, app: this })
    return instance
  }

  public async closeWindow(windowId: string): Promise<boolean> {
    const win = this.windowManager.get(windowId)
    if (!win) return false

    const closeCtx = { window: win, app: this, cancel: false }
    await this.hooks.callHook('window:before-close', closeCtx)
    if (closeCtx.cancel) return false

    this._windowIds.delete(windowId)
    this.windowManager.closeWindow(windowId)
    this.actor.send({ type: 'CLOSE_WINDOW' })
    this.refreshSnapshot()

    await this.hooks.callHook('window:closed', { windowId, app: this })
    return true
  }

  public closeAllWindows(): void {
    for (const id of Array.from(this._windowIds)) {
      this.windowManager.closeWindow(id)
    }
    this._windowIds.clear()
    this.refreshSnapshot()
  }

  public async suspend(): Promise<boolean> {
    if (!this.isRunning || this.isSuspended) return false

    const ctx = { app: this, signal: 'SIGSTOP' as const, cancel: false }
    await this.hooks.callHook('app:before-suspend', ctx)
    if (ctx.cancel) return false

    for (const id of this._windowIds) {
      this.windowManager.get(id)?.minimize()
    }

    this.actor.send({ type: 'SIGSTOP' })
    this.refreshSnapshot()

    await this.hooks.callHook('app:suspended', { app: this })
    this.ipc.emit('process:suspended', { id: this.id, pid: this._pid }, { source: 'kernel' })
    return true
  }

  public async resume(): Promise<boolean> {
    if (!this.isSuspended) return false

    const ctx = { app: this, signal: 'SIGCONT' as const, cancel: false }
    await this.hooks.callHook('app:before-resume', ctx)
    if (ctx.cancel) return false

    for (const id of this._windowIds) {
      const win = this.windowManager.get(id)
      if (win) {
        win.unminimize()
        this.windowManager.focusWindow(win.id)
      }
    }

    this.actor.send({ type: 'SIGCONT' })
    this.refreshSnapshot()

    await this.hooks.callHook('app:resumed', { app: this })
    this.ipc.emit('process:resumed', { id: this.id, pid: this._pid }, { source: 'kernel' })
    return true
  }

  public async terminate(signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): Promise<boolean> {
    const ctx = { app: this, signal, cancel: false }
    await this.hooks.callHook('app:before-terminate', ctx)
    if (ctx.cancel && signal !== 'SIGKILL') return false

    const oldPid = this._pid
    this.closeAllWindows()
    await this.config.onClose?.(this)

    this._pid = null
    this._startedAt = null
    this.actor.send({ type: signal })
    this.refreshSnapshot()

    await this.hooks.callHook('app:terminated', {
      id: this.id,
      title: this.config.title,
      pid: oldPid,
    })
    this.ipc.emit(
      'process:terminated',
      { id: this.id, pid: oldPid, signal },
      { source: 'kernel', severity: signal === 'SIGKILL' ? 'warn' : 'info' },
    )
    return true
  }
}

export class ApplicationManager {
  private apps = new Map<string, ApplicationInstance>()
  private snapshotCache: readonly ApplicationInstance[] = Object.freeze([])
  private pidCounter = 1000
  private subscribers = new Set<(apps: ApplicationInstance[]) => void>()

  private windowManager: WindowManager
  private workspaceManager?: WorkspaceManager
  private hooks: Hookable<DesktopRuntimeHooks>
  private ipc: CoreIPCBus

  constructor(options: {
    windowManager: WindowManager
    workspaceManager?: WorkspaceManager
    hooks?: Hookable<DesktopRuntimeHooks>
    ipc?: CoreIPCBus
  }) {
    this.windowManager = options.windowManager
    this.workspaceManager = options.workspaceManager
    this.hooks = options.hooks ?? globalDesktopHooks
    this.ipc = options.ipc ?? globalIPCBus
  }

  public getSnapshot(): ApplicationInstance[] {
    return this.snapshotCache as ApplicationInstance[]
  }

  public subscribe(callback: (apps: ApplicationInstance[]) => void): () => void {
    this.subscribers.add(callback)
    callback(this.getSnapshot())
    return () => {
      this.subscribers.delete(callback)
    }
  }

  private notify(): void {
    this.snapshotCache = Object.freeze(Array.from(this.apps.values()))
    const snapshot = this.getSnapshot()
    for (const sub of this.subscribers) {
      try {
        sub(snapshot)
      } catch {
        // ignore
      }
    }
  }

  public register(config: ApplicationConfig): ApplicationInstance {
    const existing = this.apps.get(config.id)
    if (existing) return existing

    const instance = new ApplicationInstance({
      config,
      windowManager: this.windowManager,
      workspaceManager: this.workspaceManager,
      hooks: this.hooks,
      ipc: this.ipc,
      allocatePid: () => {
        this.pidCounter += Math.floor(Math.random() * 7) + 1
        return this.pidCounter
      },
    })

    instance.subscribe(() => {
      this.notify()
    })

    this.apps.set(config.id, instance)
    void config.onReady?.(instance)
    void this.hooks.callHook('app:defined', { app: instance })
    this.notify()
    return instance
  }

  public get(id: string): ApplicationInstance | undefined {
    return this.apps.get(id)
  }

  public getByPid(pid: number): ApplicationInstance | undefined {
    return Array.from(this.apps.values()).find((app) => app.pid === pid)
  }

  public get runningApps(): ApplicationInstance[] {
    return Array.from(this.apps.values()).filter((app) => app.isRunning)
  }

  public async launch(id: string, entryKey?: string, argument?: string): Promise<boolean> {
    const app = this.apps.get(id)
    if (!app) return false
    return app.launch(entryKey, argument)
  }

  public async terminate(idOrPid: string | number, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): Promise<boolean> {
    const app = typeof idOrPid === 'number' ? this.getByPid(idOrPid) : this.get(idOrPid)
    if (!app) return false
    return app.terminate(signal)
  }
}
