export const DESKTOP_STORE_ID = 'desktop'
export const DESKTOP_WORKSPACE_STORE_ID = 'desktop/workspace'
export const DESKTOP_WINDOW_STORE_ID = 'desktop/window'
export const DESKTOP_VOLUME_STORE_ID = 'desktop/volume'
export const DESKTOP_DEFAULT_APPS_STORE_ID = 'desktop/defaultApps'

export const applicationWindowsStoreId = (appId: string) =>
  `desktop/application/${appId}/windows`

export const applicationMetaStoreId = (appId: string) =>
  `desktop/application/${appId}/meta`
