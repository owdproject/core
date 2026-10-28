import { createHooks, type Hookable } from 'hookable'
import type { DesktopRuntimeHooks } from '../types'

export type { DesktopRuntimeHooks }

export function createDesktopHooks(): Hookable<DesktopRuntimeHooks> {
  return createHooks<DesktopRuntimeHooks>()
}

// Global default hooks bus for convenience
export const globalDesktopHooks: Hookable<DesktopRuntimeHooks> = createDesktopHooks()
