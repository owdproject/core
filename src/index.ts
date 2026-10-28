/**
 * @owdproject/core
 * Headless desktop operating system engine: windows, applications, workspaces, commands, hooks, IPC, and pointer math.
 */

// Unified Desktop Factory & Instance
export * from './Desktop'

// Types
export * from './types'

// Finite State Machines (XState v5)
export * from './machines'

// Geometry, Snapping, Tiling & Centering Math
export * from './layout'

// Headless Window, Application & Workspace Managers
export * from './managers'

// Lifecycle Hooks, IPC Bus, Command Registry, Parser & Desktop Keybindings
export * from './events'

// Desktop Session Serialization & Hydration
export * from './session'

// Browser DOM Utilities & W3C Pointer Drag/Resize Engine (SSR/SSG-safe)
export * from './dom'
