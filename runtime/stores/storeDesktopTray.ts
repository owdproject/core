import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DESKTOP_TRAY_STORE_ID } from './storeIds'

export interface DesktopTrayIconItem {
  id: string
  icon?: string
  label?: string
  component?: any
  meta?: Record<string, any>
  onClick?: () => void
}

export const useDesktopTrayStore = defineStore(DESKTOP_TRAY_STORE_ID, () => {
  const items = ref<DesktopTrayIconItem[]>([])

  function registerIcon(item: DesktopTrayIconItem) {
    if (items.value.some(i => i.id === item.id)) {
      console.warn(`[Tray] Icon item ${item.id} is already registered.`)
      return
    }
    items.value.push(item)
  }

  function unregisterIcon(id: string) {
    items.value = items.value.filter(i => i.id !== id)
  }

  return {
    items: computed(() => items.value),
    registerIcon,
    unregisterIcon
  }
})
