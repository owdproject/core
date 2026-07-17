import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nanoid } from 'nanoid'
import { DESKTOP_NOTIFICATIONS_STORE_ID } from './storeIds'

export interface DesktopNotification {
  id: string
  title: string
  body: string
  icon?: string
  appId?: string
  timestamp: number
  read: boolean
}

export const useDesktopNotificationsStore = defineStore(
  DESKTOP_NOTIFICATIONS_STORE_ID,
  () => {
    const list = ref<DesktopNotification[]>([])

    function add(notification: {
      title: string
      body: string
      icon?: string
      appId?: string
    }) {
      const item: DesktopNotification = {
        id: nanoid(),
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        appId: notification.appId,
        timestamp: Date.now(),
        read: false,
      }
      list.value.unshift(item)
      return item
    }

    function remove(id: string) {
      list.value = list.value.filter((n) => n.id !== id)
    }

    function clear() {
      list.value = []
    }

    function markAsRead(id: string) {
      const item = list.value.find((n) => n.id === id)
      if (item) {
        item.read = true
      }
    }

    function markAllAsRead() {
      list.value.forEach((n) => {
        n.read = true
      })
    }

    return {
      list,
      add,
      remove,
      clear,
      markAsRead,
      markAllAsRead,
    }
  },
  {
    // @ts-expect-error
    persistedState: {
      persist: true,
    },
  },
)
