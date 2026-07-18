import { computed } from 'vue'
import { useDesktopStore } from '../stores/storeDesktop'
import { useDesktopNotificationsStore } from '../stores/storeNotifications'
import { useDesktopWorkspaceStore } from '../stores/storeDesktopWorkspace'
import { useDesktopVolumeStore } from '../stores/storeDesktopVolume'
import { useDesktopConfig } from './useDesktopConfig'

import { useDesktopTrayStore } from '../stores/storeDesktopTray'

export function useDesktop() {
  const store = useDesktopStore()
  const config = useDesktopConfig()
  const workspace = useDesktopWorkspaceStore()
  const volume = useDesktopVolumeStore()
  const notificationsStore = useDesktopNotificationsStore()
  const trayStore = useDesktopTrayStore()

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

  return {
    store,
    config,
    workspace,
    volume,
    notifications,
    tray
  }
}
