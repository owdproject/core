import { computed, reactive } from 'vue'
import { useDesktopStore } from '../stores/storeDesktop'
import { useDesktopNotificationsStore } from '../stores/storeNotifications'
import { useDesktopWorkspaceStore } from '../stores/storeDesktopWorkspace'
import { useDesktopVolumeStore } from '../stores/storeDesktopVolume'
import { useDesktopConfig } from './useDesktopConfig'
import { useDesktopTrayStore } from '../stores/storeDesktopTray'
import { useApplicationManager } from './useApplicationManager'

// Global reactive services registry for inter-app communication
const services = reactive(new Map<string, any>())

// Global reactive extensions object for dynamic namespace injection
const extensions = reactive<Record<string, any>>({})

export function registerDesktopExtension(name: string, extension: any) {
  extensions[name] = extension
}

export function useDesktop() {
  const store = useDesktopStore()
  const config = useDesktopConfig()
  const workspace = useDesktopWorkspaceStore()
  const volume = useDesktopVolumeStore()
  const notificationsStore = useDesktopNotificationsStore()
  const trayStore = useDesktopTrayStore()
  const appManager = useApplicationManager()

  const notifications = {
    list: computed(() => notificationsStore.list),
    add: notificationsStore.add,
    remove: notificationsStore.remove,
    clear: notificationsStore.clear,
    markAsRead: notificationsStore.markAsRead,
    markAllAsRead: notificationsStore.markAllAsRead,
  }

  const tray = {
    items: computed(() => trayStore.items),
    registerIcon: trayStore.registerIcon,
    unregisterIcon: trayStore.unregisterIcon
  }

  const apps = {
    list: computed(() => [...appManager.apps.values()]),
    get: appManager.getAppById,
    isRunning: appManager.isAppRunning,
    launch: appManager.launchAppEntry,
    close: appManager.closeApp,
    exec: appManager.execAppCommand
  }

  const windows = {
    list: computed(() => [...appManager.windowsOpened.value.values()]),
    get: appManager.getWindowOpenedId,
    close: (windowId: string) => {
      const win = appManager.getWindowOpenedId(windowId)
      if (win) {
        win.application.closeWindow(win.state.id)
      }
    },
    closeAll: (appId?: string) => {
      if (appId) {
        const app = appManager.getAppById(appId)
        if (app) {
          app.closeAllWindows()
        }
      } else {
        for (const app of appManager.apps.values()) {
          app.closeAllWindows()
        }
      }
    }
  }

  const servicesRegistry = {
    register: (id: string, service: any) => {
      services.set(id, service)
    },
    unregister: (id: string) => {
      services.delete(id)
    },
    get: (id: string) => {
      return services.get(id)
    },
    has: (id: string) => {
      return services.has(id)
    }
  }

  return {
    store,
    config,
    workspace,
    volume,
    notifications,
    tray,
    apps,
    windows,
    services: servicesRegistry,
    ...extensions
  }
}
