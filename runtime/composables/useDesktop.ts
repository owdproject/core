import { computed } from 'vue'
import { useDesktopNotificationsStore } from '../stores/storeNotifications'
import { useDesktopWorkspaceStore } from '../stores/storeDesktopWorkspace'
import { useDesktopVolumeStore } from '../stores/storeDesktopVolume'
import { useDesktopConfig } from './useDesktopConfig'
import { useDesktopIdentity } from './useDesktopIdentity'
import { useDesktopSession } from './useDesktopSession'
import { useApplicationManager } from './useApplicationManager'
import { useTerminalManager } from './useTerminalManager'

export function useDesktop() {
  const config = useDesktopConfig()
  const workspace = useDesktopWorkspaceStore()
  const volumeStore = useDesktopVolumeStore()
  const notificationsStore = useDesktopNotificationsStore()
  const identity = useDesktopIdentity()
  const session = useDesktopSession()
  const apps = useApplicationManager()
  const terminal = useTerminalManager()

  const notifications = {
    list: notificationsStore.list,
    add: notificationsStore.add,
    remove: notificationsStore.remove,
    clear: notificationsStore.clear,
    markAsRead: notificationsStore.markAsRead,
    markAllAsRead: notificationsStore.markAllAsRead,
  }

  const volume = {
    master: computed(() => volumeStore.master),
    setMaster: volumeStore.setMasterVolume,
  }

  return {
    config,
    workspace,
    volume,
    notifications,
    identity,
    session,
    apps,
    terminal,
  }
}
