import { describe, expect, it, vi } from 'vitest'
import { createDesktop } from '../src/Desktop'
import type { ApplicationConfig } from '../src/types'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

function setup(config: Partial<ApplicationConfig> = {}) {
  const desktop = createDesktop({ workspaces: ['workspace-1', 'workspace-2'] })
  const application = desktop.applications.register({
    id: 'editor', title: 'Editor', singleton: true, entries: {},
    windows: {
      main: { title: 'Main', size: { width: 320, height: 240 } },
      secondary: { title: 'Secondary', size: { width: 480, height: 300 } },
    },
    ...config,
  })
  return { desktop, application }
}

describe('ApplicationManager singleton windows', () => {
  it('keeps one tracked window across concurrent launches while retaining launch callbacks', async () => {
    const onLaunch = vi.fn()
    const { desktop, application } = setup({ onLaunch })
    const opened = vi.fn()
    desktop.hooks.hook('window:opened', opened)

    expect(await Promise.all(Array.from({ length: 4 }, () => desktop.applications.launch('editor'))))
      .toEqual([true, true, true, true])

    const windows = desktop.windows.getSnapshot()
    expect(windows).toHaveLength(1)
    expect(application.getSnapshot().windowIds).toEqual([windows[0]!.id])
    expect(application.isRunning).toBe(true)
    expect(application.pid).not.toBeNull()
    expect(opened).toHaveBeenCalledTimes(1)
    expect(onLaunch).toHaveBeenCalledTimes(4)
  })

  it('reuses a window committed while another before-open hook was waiting', async () => {
    const { desktop, application } = setup()
    const entered = deferred()
    const release = deferred()
    desktop.hooks.hook('window:before-open', async ({ meta }) => {
      if (meta?.request === 'slow') {
        entered.resolve()
        await release.promise
      }
    })
    const opened = vi.fn()
    desktop.hooks.hook('window:opened', opened)

    const slow = application.openWindow('main', { request: 'slow' })
    await entered.promise
    const winner = await application.openWindow('secondary', { request: 'winner' }, {
      workspace: 'workspace-2', position: { x: 91, y: 72 },
    })
    winner!.minimize()
    release.resolve()

    expect(await slow).toBe(winner)
    expect(desktop.windows.getSnapshot()).toHaveLength(1)
    expect(application.getSnapshot().windowIds).toEqual([winner!.id])
    expect(winner!.model).toBe('secondary')
    expect(winner!.meta).toEqual({ request: 'winner' })
    expect(winner!.config.title).toBe('Secondary')
    expect(winner!.state.workspace).toBe('workspace-2')
    expect(winner!.state.position).toMatchObject({ x: 91, y: 72 })
    expect(winner!.state.active).toBe(true)
    expect(winner!.state.focused).toBe(true)
    expect(opened).toHaveBeenCalledTimes(1)
  })

  it('honors a delayed before-open veto without focusing or returning a concurrent window', async () => {
    const { desktop, application } = setup()
    const entered = deferred()
    const release = deferred()
    desktop.hooks.hook('window:before-open', async (context) => {
      if (context.meta?.cancel) {
        entered.resolve()
        await release.promise
        context.cancel = true
      }
    })

    const canceled = application.openWindow('main', { cancel: true })
    await entered.promise
    const winner = await application.openWindow('secondary')
    winner!.minimize()
    const focus = vi.spyOn(desktop.windows, 'focusWindow')
    release.resolve()

    expect(await canceled).toBeUndefined()
    expect(focus).not.toHaveBeenCalled()
    expect(winner!.state.active).toBe(false)
    expect(desktop.windows.getSnapshot()).toHaveLength(1)
    expect(application.getSnapshot().windowIds).toEqual([winner!.id])
  })

  it('allows a later opening after a canceled request and retains before-launch cancellation', async () => {
    const { desktop, application } = setup()
    const cancelOpen = desktop.hooks.hook('window:before-open', (context) => { context.cancel = true })
    expect(await application.openWindow('main')).toBeUndefined()
    expect(desktop.windows.getSnapshot()).toHaveLength(0)
    expect(application.getSnapshot().windowIds).toEqual([])
    cancelOpen()

    const cancelLaunch = desktop.hooks.hook('app:before-launch', (context) => { context.cancel = true })
    expect(await desktop.applications.launch('editor')).toBe(false)
    expect(application.pid).toBeNull()
    expect(desktop.windows.getSnapshot()).toHaveLength(0)
    cancelLaunch()

    await desktop.applications.launch('editor')
    expect(desktop.windows.getSnapshot()).toHaveLength(1)
  })

  it('restores sequential singleton launches and permits close then concurrent relaunch', async () => {
    const onClose = vi.fn()
    const { desktop, application } = setup({ onClose })
    await desktop.applications.launch('editor')
    const first = desktop.windows.getSnapshot()[0]!
    const beforeOpen = vi.fn()
    desktop.hooks.hook('window:before-open', beforeOpen)
    first.minimize()

    await desktop.applications.launch('editor')
    expect(desktop.windows.getSnapshot()).toEqual([first])
    expect(first.state.active).toBe(true)
    expect(first.state.focused).toBe(true)
    expect(beforeOpen).not.toHaveBeenCalled()

    expect(await application.closeWindow(first.id)).toBe(true)
    expect(application.getSnapshot().windowIds).toEqual([])
    expect(application.pid).toBeNull()
    expect(application.stateValue).toBe('ready')
    expect(onClose).not.toHaveBeenCalled()

    await Promise.all([desktop.applications.launch('editor'), desktop.applications.launch('editor')])
    const reopened = desktop.windows.getSnapshot()
    expect(reopened).toHaveLength(1)
    expect(reopened[0]!.id).not.toBe(first.id)
    expect(application.getSnapshot().windowIds).toEqual([reopened[0]!.id])
    await desktop.applications.terminate('editor')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('preserves concurrent independent windows for non-singleton applications', async () => {
    const { desktop, application } = setup({ singleton: false })
    const entered = deferred()
    const release = deferred()
    desktop.hooks.hook('window:before-open', async ({ meta }) => {
      if (meta?.request === 'slow') {
        entered.resolve()
        await release.promise
      }
    })
    const slow = application.openWindow('main', { request: 'slow' })
    await entered.promise
    const fast = await application.openWindow('secondary', { request: 'fast' })
    release.resolve()
    const other = await slow

    expect(other).not.toBe(fast)
    expect(other!.model).toBe('main')
    expect(other!.meta).toEqual({ request: 'slow' })
    expect(fast!.model).toBe('secondary')
    expect(fast!.meta).toEqual({ request: 'fast' })
    expect(desktop.windows.getSnapshot()).toHaveLength(2)
    expect(application.getSnapshot().windowIds).toEqual([fast!.id, other!.id])
  })
})
