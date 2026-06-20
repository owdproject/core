import { nextTick } from 'vue'
import { useApplicationManager } from '../composables/useApplicationManager'
import { useDesktopWindowStore } from '../stores/storeDesktopWindow'

export function normalizeApplicationConfig(
  config: ApplicationConfig,
): ApplicationConfig {
  const normalizedEntries: Record<string, ApplicationEntry> = {}

  if (config.entries) {
    for (const [key, entry] of Object.entries(config.entries)) {
      normalizedEntries[key] = {
        ...entry,
        title: entry.title ?? config.title,
        icon: entry.icon ?? config.icon,
        category: entry.category ?? config.category,
        visibility: entry.visibility ?? 'primary',
      }
    }
  }

  return {
    ...config,
    version: config.version ?? 'unknown',
    description: config.description ?? '',
    category: config.category ?? 'other',
    entries: normalizedEntries,
  }
}

export interface AutoStartPlaygroundApp {
  id: string
  entry: string
  windowModel?: string
}

async function waitForDesktopWorkArea(
  maxAttempts: number,
  intervalMs: number,
): Promise<boolean> {
  const desktopWindowStore = useDesktopWindowStore()

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { width, height } = desktopWindowStore.workArea
    if (width > 0 && height > 0) {
      return true
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  return false
}

/**
 * Auto-starts one or more applications in a playground environment.
 * Delays execution until the Nuxt app is mounted and the desktop shell is ready,
 * then attempts to launch the apps and bring their main windows to the front.
 */
export function autoStartPlaygroundApps(
  nuxtApp: any,
  apps: AutoStartPlaygroundApp[],
  maxAttempts = 80,
  intervalMs = 50,
) {
  const applicationManager = useApplicationManager()

  async function tryLaunch(appConfig: AutoStartPlaygroundApp): Promise<boolean> {
    if (!applicationManager.isAppDefined(appConfig.id)) {
      return false
    }

    const app = applicationManager.getAppById(appConfig.id)!

    if (app.storeWindows.$persistedState) {
      await app.storeWindows.$persistedState.isReady()
    }

    // Drop stale window state from prior sessions in playground
    app.closeAllWindows()
    app.storeWindows.windows = {}

    await waitForDesktopWorkArea(maxAttempts, intervalMs)

    await applicationManager.execAppCommand(appConfig.id, appConfig.entry)

    const model = appConfig.windowModel ?? 'main'
    const window = app.getFirstWindowByModel(model)
    if (window) {
      window.actions.setActive(true)
      window.actions.bringToFront()
    }

    return true
  }

  nuxtApp.hook('app:mounted', async () => {
    await nextTick()

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let allStarted = true
      for (const app of apps) {
        const started = await tryLaunch(app)
        if (!started) {
          allStarted = false
          break
        }
      }
      if (allStarted) return

      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    console.warn(
      `[playground-launch] Failed to auto-start all apps:`,
      apps.map(a => a.id),
    )
  })
}
