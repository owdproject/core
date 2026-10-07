import { defineNuxtModule, installModule } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: '@owdproject/core',
    configKey: 'desktop',
  },
  defaults: {
    theme: '@owdproject/theme-nova',
    apps: [],
    modules: [],
  },
  moduleDependencies: {
    '@pinia/nuxt': {},
    '@nuxt/fonts': {},
    '@nuxt/icon': {
      defaults: {
        clientBundle: {
          scan: true,
          sizeLimitKb: 256,
        },
      },
    },
    '@vueuse/nuxt': {},
    '@nuxtjs/i18n': {},
  },
  async setup(options, _nuxt) {
    await installModule('nuxt-desktop', options)
  }
})

// Re-export utility functions from nuxt-desktop for desktop.config.ts
export {
  defineDesktopConfig,
  defineDesktopModule,
  defineDesktopTheme,
  hasDesktopModule,
  mergeDesktopExtensionConfig,
  setDesktopExtensionConfig,
} from 'nuxt-desktop'

