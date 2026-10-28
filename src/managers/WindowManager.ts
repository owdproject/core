import { createActor, type ActorRefFrom } from 'xstate'
import type { Hookable } from 'hookable'
import { windowMachine } from '../machines/machineWindow'
import { computeSnapRect } from '../layout/utilWindowLayout'
import type {
  DesktopRuntimeHooks,
  DesktopWorkareaRect,
  SpatialTransform,
  WindowBounds,
  WindowConfig,
  WindowLayout,
  WindowState,
} from '../types'
import { globalDesktopHooks } from '../events/DesktopHooks'
import { CoreIPCBus, globalIPCBus } from '../events/IPC'

function formatWindowSnapshotValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length > 0) {
      const [k, v] = entries[0]!
      return `${k}.${formatWindowSnapshotValue(v)}`
    }
  }
  return 'normal'
}

export class WindowInstance {
  public readonly id: string
  public readonly model: string
  public readonly applicationId?: string
  public config: WindowConfig
  public state: WindowState
  public meta: Record<string, any>

  private actor: ActorRefFrom<typeof windowMachine>
  private isDisposed = false
  private subscribers = new Set<(snapshot: WindowState) => void>()

  constructor(options: {
    id: string
    model: string
    applicationId?: string
    config: WindowConfig
    initialState?: Partial<WindowState>
    meta?: Record<string, any>
    workspace?: string
  }) {
    this.id = options.id
    this.model = options.model
    this.applicationId = options.applicationId
    this.config = { ...options.config }
    this.meta = options.meta ? { ...options.meta } : {}

    const baseState: WindowState = {
      id: this.id,
      createdAt: Date.now(),
      category: options.config.category,
      workspace: options.initialState?.workspace ?? options.workspace ?? 'workspace-1',
      position: options.initialState?.position
        ? { ...options.initialState.position }
        : options.config.position
          ? { ...options.config.position }
          : { x: 0, y: 0, z: 0 },
      size: options.initialState?.size
        ? { ...options.initialState.size }
        : options.config.size
          ? { ...options.config.size }
          : { width: 640, height: 480 },
      focused: options.initialState?.focused ?? true,
      active: options.initialState?.active ?? true,
      maximized: options.initialState?.maximized ?? false,
      layout: options.initialState?.layout ?? 'normal',
      draggable: options.config.draggable !== false,
      resizable: options.config.resizable !== false,
      minimizable: options.config.minimizable !== false,
      maximizable: options.config.maximizable !== false,
      destroyable: options.config.destroyable !== false,
      ...options.initialState,
    }

    this.state = Object.freeze(baseState)

    let initialMachineValue: any = { normal: 'unfocused' }
    if (this.state.active === false) {
      initialMachineValue = 'minimized'
    } else if (this.state.maximized === true) {
      initialMachineValue = this.state.focused ? { maximized: 'focused' } : { maximized: 'unfocused' }
    } else if (this.state.focused === true) {
      initialMachineValue = { normal: { focused: 'idle' } }
    }

    this.actor = createActor(windowMachine, {
      state: windowMachine.resolveState({
        value: initialMachineValue,
        context: {
          wasMaximized: !!this.state.maximized,
          config: this.config,
        },
      }),
    })

    this.actor.subscribe((snapshot: any) => {
      if (this.isDisposed) return

      const isMinimized = snapshot.matches('minimized')
      const isMaximized = snapshot.matches('maximized')
      const isFocused =
        snapshot.matches('normal.focused') ||
        snapshot.matches('maximized.focused')
      const isDragging = snapshot.matches('normal.focused.dragging')
      const isResizing = snapshot.matches('normal.focused.resizing')

      const nextActive = !isMinimized
      if (
        this.state.active !== nextActive ||
        this.state.maximized !== isMaximized ||
        this.state.focused !== isFocused ||
        this.state.dragging !== isDragging ||
        this.state.resizing !== isResizing
      ) {
        this.updateState({
          active: nextActive,
          maximized: isMaximized,
          focused: isFocused,
          dragging: isDragging,
          resizing: isResizing,
        })
      }
    })

    this.actor.start()
  }

  private updateState(patch: Partial<WindowState>): void {
    this.state = Object.freeze({
      ...this.state,
      ...patch,
    })
    this.notify()
  }

  public getSnapshot(): WindowState {
    return this.state
  }

  public subscribe(callback: (snapshot: WindowState) => void): () => void {
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

  public get stateValue(): string {
    return formatWindowSnapshotValue(this.actor.getSnapshot().value)
  }

  public setPosition(data: { x: number; y: number; z?: number }): void {
    this.updateState({
      position: {
        x: Math.round(data.x),
        y: Math.round(data.y),
        z: data.z !== undefined ? data.z : this.state.position?.z ?? 0,
      },
    })
  }

  public setSize(data: { width: number; height: number }): void {
    this.updateState({
      size: {
        ...this.state.size,
        width: Math.round(data.width),
        height: Math.round(data.height),
      },
    })
  }

  public setFocus(value: boolean): void {
    if (this.isDisposed) return
    if (value) {
      if (!this.state.focused) {
        this.actor.send({ type: 'FOCUS' })
      }
    } else {
      if (this.state.focused) {
        this.actor.send({ type: 'BLUR' })
      }
    }
  }

  public minimize(): boolean {
    if (this.isDisposed || !this.state.minimizable) return false
    this.actor.send({ type: 'MINIMIZE' })
    return true
  }

  public unminimize(): boolean {
    if (this.isDisposed) return false
    this.actor.send({ type: 'RESTORE' })
    return true
  }

  public maximize(): boolean {
    if (this.isDisposed || !this.state.maximizable) return false
    this.actor.send({ type: 'MAXIMIZE' })
    return true
  }

  public unmaximize(): boolean {
    if (this.isDisposed || !this.state.maximizable) return false
    this.actor.send({ type: 'RESTORE' })
    return true
  }

  public toggleMaximize(): boolean {
    if (this.isDisposed || !this.state.maximizable) return false
    if (this.state.maximized) {
      return this.unmaximize()
    } else {
      return this.maximize()
    }
  }

  public startDrag(): void {
    if (!this.isDisposed) this.actor.send({ type: 'DRAG_START' })
  }

  public stopDrag(): void {
    if (!this.isDisposed) this.actor.send({ type: 'DRAG_END' })
  }

  public startResize(): void {
    if (!this.isDisposed) this.actor.send({ type: 'RESIZE_START' })
  }

  public stopResize(): void {
    if (!this.isDisposed) this.actor.send({ type: 'RESIZE_END' })
  }

  public setLayout(layout: WindowLayout, workarea?: DesktopWorkareaRect): boolean {
    if (this.isDisposed) return false

    if (layout === 'normal') {
      this.actor.send({ type: 'RESTORE' })
      this.clearLayout()
      return true
    }

    if (!this.state.maximizable) return false

    if (layout === 'maximize') {
      this.saveBoundsBeforeLayout()
      this.actor.send({ type: 'MAXIMIZE' })
      this.updateState({ layout: 'maximize', maximized: true })
      if (workarea && workarea.width > 0 && workarea.height > 0) {
        this.setPosition({ x: workarea.x, y: workarea.y })
        this.setSize({ width: workarea.width, height: workarea.height })
      }
    } else {
      this.actor.send({ type: 'RESTORE' })
      this.saveBoundsBeforeLayout()
      this.updateState({ layout, maximized: false })

      if (workarea && workarea.width > 0 && workarea.height > 0) {
        const rect = computeSnapRect(layout, workarea)
        this.setPosition({ x: rect.x, y: rect.y })
        this.setSize({ width: rect.width, height: rect.height })
      }
    }

    return true
  }

  public clearLayout(): boolean {
    const bounds = this.state.boundsBeforeLayout
    const nextState: Partial<WindowState> = {
      layout: 'normal',
      maximized: false,
      boundsBeforeLayout: undefined,
    }
    if (bounds) {
      nextState.position = {
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        z: this.state.position?.z ?? 0,
      }
      nextState.size = {
        ...this.state.size,
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
      }
    }
    this.updateState(nextState)
    return true
  }

  public saveBoundsBeforeLayout(): void {
    if (this.state.layout && this.state.layout !== 'normal') return

    const pos = this.state.position ?? { x: 0, y: 0 }
    const size = this.state.size ?? { width: 640, height: 480 }

    const bounds: WindowBounds = {
      x: pos.x ?? 0,
      y: pos.y ?? 0,
      width: typeof size.width === 'number' ? size.width : 640,
      height: typeof size.height === 'number' ? size.height : 480,
    }
    this.updateState({ boundsBeforeLayout: bounds })
  }

  public setWorkspace(workspaceId: string): void {
    this.updateState({ workspace: workspaceId })
  }

  get workspace(): string {
    return this.state.workspace
  }

  public setSpatialTransform(transform: SpatialTransform): void {
    this.updateState({ spatial: { ...transform } })
  }

  get spatial(): SpatialTransform | undefined {
    return this.state.spatial
  }

  public dispose(): void {
    if (this.isDisposed) return
    this.isDisposed = true
    try {
      this.actor.stop()
    } catch {
      // ignore
    }
    this.subscribers.clear()
  }
}

export class WindowManager {
  private windows = new Map<string, WindowInstance>()
  private snapshotCache: readonly WindowInstance[] = Object.freeze([])
  private zIndexCounter = 100
  private subscribers = new Set<(windows: WindowInstance[]) => void>()
  private hooks: Hookable<DesktopRuntimeHooks>
  private ipc: CoreIPCBus

  constructor(options?: {
    hooks?: Hookable<DesktopRuntimeHooks>
    ipc?: CoreIPCBus
  }) {
    this.hooks = options?.hooks ?? globalDesktopHooks
    this.ipc = options?.ipc ?? globalIPCBus
  }

  public getSnapshot(): WindowInstance[] {
    return this.snapshotCache as WindowInstance[]
  }

  public subscribe(callback: (windows: WindowInstance[]) => void): () => void {
    this.subscribers.add(callback)
    callback(this.getSnapshot())
    return () => {
      this.subscribers.delete(callback)
    }
  }

  private notify() {
    this.snapshotCache = Object.freeze(Array.from(this.windows.values()))
    const snapshot = this.getSnapshot()
    for (const sub of this.subscribers) {
      try {
        sub(snapshot)
      } catch {
        // ignore
      }
    }
  }

  public get(id: string): WindowInstance | undefined {
    return this.windows.get(id)
  }

  public get focusedWindow(): WindowInstance | undefined {
    return Array.from(this.windows.values()).find((w) => w.state.focused)
  }

  public incrementZIndex(): number {
    this.zIndexCounter += 2
    return this.zIndexCounter
  }

  public addWindow(instance: WindowInstance): void {
    this.windows.set(instance.id, instance)
    this.focusWindow(instance.id)
    this.notify()
  }

  public createWindow(options: {
    id: string
    model: string
    applicationId?: string
    config: WindowConfig
    initialState?: Partial<WindowState>
    meta?: Record<string, any>
    workspace?: string
  }): WindowInstance {
    const instance = new WindowInstance(options)
    this.addWindow(instance)
    this.ipc.emit('window:opened', { id: instance.id, model: instance.model }, { source: 'window-manager' })
    return instance
  }

  public focusWindow(id: string): void {
    const target = this.windows.get(id)
    if (!target) return

    let previousWindow: WindowInstance | undefined

    for (const win of this.windows.values()) {
      if (win.id !== id && win.state.focused) {
        previousWindow = win
        win.setFocus(false)
        void this.hooks.callHook('window:blurred', { window: win })
      }
    }

    target.setPosition({
      x: target.state.position?.x ?? 0,
      y: target.state.position?.y ?? 0,
      z: this.incrementZIndex(),
    })
    target.setFocus(true)
    void this.hooks.callHook('window:focused', { window: target, previousWindow })
    this.notify()
  }

  public closeWindow(id: string): boolean {
    const target = this.windows.get(id)
    if (!target) return false

    target.dispose()
    this.windows.delete(id)

    const remaining = Array.from(this.windows.values())
      .filter((w) => w.state.active)
      .sort((a, b) => (b.state.position?.z ?? 0) - (a.state.position?.z ?? 0))

    if (remaining.length > 0) {
      this.focusWindow(remaining[0]!.id)
    }

    this.ipc.emit('window:closed', { id }, { source: 'window-manager' })
    this.notify()
    return true
  }

  public closeAllWindows(): void {
    for (const win of this.windows.values()) {
      win.dispose()
    }
    this.windows.clear()
    this.notify()
  }

  public tileWindows(
    mode: 'horizontal' | 'vertical' | 'grid' = 'horizontal',
    workarea: DesktopWorkareaRect,
    workspaceId?: string,
    gap = 0,
  ): number {
    const activeWins = Array.from(this.windows.values()).filter(
      (w) => w.state.active && (!workspaceId || w.state.workspace === workspaceId),
    )

    if (activeWins.length === 0 || workarea.width <= 0 || workarea.height <= 0) {
      return 0
    }

    const count = activeWins.length
    const safeGap = Math.max(0, Math.round(gap))

    if (mode === 'horizontal') {
      const totalGap = safeGap * (count - 1)
      const colWidth = Math.floor((workarea.width - totalGap) / count)
      activeWins.forEach((win, index) => {
        win.saveBoundsBeforeLayout()
        win.setLayout('normal')
        win.setPosition({
          x: workarea.x + index * (colWidth + safeGap),
          y: workarea.y,
        })
        win.setSize({
          width:
            index === count - 1
              ? workarea.width - (count - 1) * (colWidth + safeGap)
              : colWidth,
          height: workarea.height,
        })
      })
    } else if (mode === 'vertical') {
      const totalGap = safeGap * (count - 1)
      const rowHeight = Math.floor((workarea.height - totalGap) / count)
      activeWins.forEach((win, index) => {
        win.saveBoundsBeforeLayout()
        win.setLayout('normal')
        win.setPosition({
          x: workarea.x,
          y: workarea.y + index * (rowHeight + safeGap),
        })
        win.setSize({
          width: workarea.width,
          height:
            index === count - 1
              ? workarea.height - (count - 1) * (rowHeight + safeGap)
              : rowHeight,
        })
      })
    } else if (mode === 'grid') {
      const cols = Math.ceil(Math.sqrt(count))
      const rows = Math.ceil(count / cols)
      const colWidth = Math.floor((workarea.width - safeGap * (cols - 1)) / cols)
      const rowHeight = Math.floor((workarea.height - safeGap * (rows - 1)) / rows)

      activeWins.forEach((win, index) => {
        const col = index % cols
        const row = Math.floor(index / cols)
        win.saveBoundsBeforeLayout()
        win.setLayout('normal')
        win.setPosition({
          x: workarea.x + col * (colWidth + safeGap),
          y: workarea.y + row * (rowHeight + safeGap),
        })
        win.setSize({
          width: col === cols - 1 ? workarea.width - (cols - 1) * (colWidth + safeGap) : colWidth,
          height: row === rows - 1 ? workarea.height - (rows - 1) * (rowHeight + safeGap) : rowHeight,
        })
      })
    }

    this.notify()
    return count
  }

  public setSpatialTransform(windowId: string, transform: SpatialTransform): void {
    const win = this.windows.get(windowId)
    if (win) {
      win.setSpatialTransform(transform)
      this.notify()
    }
  }
}
