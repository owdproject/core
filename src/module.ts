import { defineNuxtModule, installModule } from '@nuxt/kit'
import type { NuxtModule } from '@nuxt/schema'
import nuxtDesktop from 'nuxt-desktop'

const module: NuxtModule<any> = defineNuxtModule({
  meta: {
    name: '@owdproject/core',
    configKey: 'desktop',
  },
  defaults: {
    theme: '@owdproject/theme-nova',
    apps: [],
    modules: [],
  },
  async setup(options, _nuxt) {
    await installModule(nuxtDesktop, options)
  }
})

export default module

// Re-export utility functions from nuxt-desktop for desktop.config.ts
export {
  defineDesktopConfig,
  defineDesktopModule,
  defineDesktopTheme,
  hasDesktopModule,
  mergeDesktopExtensionConfig,
  setDesktopExtensionConfig,
} from 'nuxt-desktop'

