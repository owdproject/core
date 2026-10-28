/**
 * @owdproject/core - Framework-Agnostic Types
 */

export type WindowLayout =
  | 'normal'
  | 'maximize'
  | 'bottom-half'
  | 'left-half'
  | 'right-half'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export type SnapZoneHint = Exclude<WindowLayout, 'normal'>

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface DesktopWorkareaRect {
  x: number
  y: number
  width: number
  height: number
}

export type WindowSizeValue = number | string | undefined

export interface WindowSize {
  width?: WindowSizeValue
  height?: WindowSizeValue
  minWidth?: WindowSizeValue
  minHeight?: WindowSizeValue
  maxWidth?: WindowSizeValue
  maxHeight?: WindowSizeValue
}

export interface WindowPosition {
  x?: number
  y?: number
  z?: number
}

export interface SpatialPoint3D {
  x: number
  y: number
  z: number
}

export interface SpatialEuler {
  pitch: number // deg rotation X
  yaw: number   // deg rotation Y
  roll: number  // deg rotation Z
}

export interface SpatialTransform {
  position: SpatialPoint3D
  rotation?: SpatialEuler
  scale?: SpatialPoint3D
  distance?: number
  curveRadius?: number
}

export type SpatialLayoutMode = 'cylinder' | 'sphere' | 'carousel' | 'depth-stack'

export interface WindowConfig {
  title?: string
  category?: string
  icon?: string
  component?: any
  position?: WindowPosition
  size: WindowSize
  minimizable?: boolean
  maximized?: boolean
  maximizable?: boolean
  destroyable?: boolean
  draggable?: boolean
  resizable?: boolean
  spatial?: SpatialTransform
  overridable?: Partial<
    Record<
      | 'position'
      | 'size'
      | 'maximized'
      | 'draggable'
      | 'resizable'
      | 'destroyable'
      | 'minimizable',
      boolean
    >
  >
}

export interface WindowOverride {
  title?: string
  windowTitle?: string
  icon?: string
}

export interface WindowState {
  id: string
  createdAt: number
  category?: string
  workspace: string
  position?: WindowPosition
  size?: WindowSize
  spatial?: SpatialTransform
  focused: boolean
  dragging?: boolean
  resizing?: boolean
  active?: boolean
  minimizable?: boolean
  maximized?: boolean
  maximizable?: boolean
  destroyable?: boolean
  draggable?: boolean
  resizable?: boolean
  layout?: WindowLayout
  boundsBeforeLayout?: WindowBounds
}

export interface WindowStoredState {
  model: string
  state: WindowState
  meta: any
}

export type ApplicationEntryVisibility = 'primary' | 'secondary' | 'hidden'

export interface ApplicationEntry {
  title?: string
  icon?: string
  category?: string
  visibility?: ApplicationEntryVisibility
  command: string | any
}

export type ApplicationPermission = string

export interface ApplicationConfigProvide {
  name: string
  entry: string
  command?: string
}

export interface ApplicationConfig {
  id: string
  title: string
  icon?: string
  category?: string
  version?: string
  description?: string
  provides?: ApplicationConfigProvide
  singleton?: boolean
  meta?: Record<string, any>
  permissions?: ApplicationPermission[]
  windows?: { [key: string]: WindowConfig }
  entries: { [key: string]: ApplicationEntry }
  commands?: { [key: string]: (app: any, args: any) => void }
  terminal?: { [commandName: string]: Omit<DesktopCommand, 'name' | 'applicationId'> }
  onReady?(app: any): void | Promise<void>
  onLaunch?(app: any): void | Promise<void>
  onRestore?(app: any): void | Promise<void>
  onClose?(app: any): void | Promise<void>
}

export interface DesktopCommandArg {
  name: string
  description?: string
  required?: boolean
}

export interface DesktopCommandOption {
  flag: string
  description?: string
}

export interface DesktopCommand {
  name: string
  applicationId: string
  description?: string
  usage?: string
  args?: DesktopCommandArg[]
  options?: DesktopCommandOption[]
}

export interface CommandOutput {
  message: string
  isError?: boolean
}

export interface DesktopKernelEvent {
  id: string
  timestamp: number
  channel: string
  source: string
  severity: 'info' | 'warn' | 'error'
  payload?: any
}

export interface DesktopAppDefineContext {
  id: string
  config: ApplicationConfig
  cancel?: boolean
}

export interface DesktopAppLaunchContext {
  app: any
  entryKey?: string
  argument?: string
  cancel?: boolean
}

export interface DesktopAppSignalContext {
  app: any
  signal?: 'SIGTERM' | 'SIGKILL' | 'SIGSTOP' | 'SIGCONT'
  cancel?: boolean
}

export interface DesktopWindowOpenContext {
  app: any
  model: string
  config: WindowConfig
  meta?: Record<string, any>
  cancel?: boolean
}

export interface DesktopWindowCloseContext {
  window: any
  app: any
  cancel?: boolean
}

export interface DesktopCommandExecContext {
  input: string
  commandName: string
  args: string[]
  cancel?: boolean
  overrideOutput?: CommandOutput
}

export interface DesktopWorkspaceSwitchContext {
  from: string
  to: string
  cancel?: boolean
}

export interface DesktopRuntimeHooks {
  'app:before-define': (ctx: DesktopAppDefineContext) => Promise<void> | void
  'app:defined': (payload: { app: any }) => Promise<void> | void
  'app:before-launch': (ctx: DesktopAppLaunchContext) => Promise<void> | void
  'app:launched': (payload: { app: any; pid: number | null }) => Promise<void> | void
  'app:before-suspend': (ctx: DesktopAppSignalContext) => Promise<void> | void
  'app:suspended': (payload: { app: any }) => Promise<void> | void
  'app:before-resume': (ctx: DesktopAppSignalContext) => Promise<void> | void
  'app:resumed': (payload: { app: any }) => Promise<void> | void
  'app:before-terminate': (ctx: DesktopAppSignalContext) => Promise<void> | void
  'app:terminated': (payload: { id: string; title: string; pid: number | null }) => Promise<void> | void

  'window:before-open': (ctx: DesktopWindowOpenContext) => Promise<void> | void
  'window:opened': (payload: { window: any; app: any }) => Promise<void> | void
  'window:focused': (payload: { window: any; previousWindow?: any }) => Promise<void> | void
  'window:blurred': (payload: { window: any }) => Promise<void> | void
  'window:layout-change': (payload: { window: any; layout: WindowLayout }) => Promise<void> | void
  'window:before-close': (ctx: DesktopWindowCloseContext) => Promise<void> | void
  'window:closed': (payload: { windowId: string; app: any }) => Promise<void> | void

  'command:before-exec': (ctx: DesktopCommandExecContext) => Promise<void> | void
  'command:after-exec': (payload: { input: string; commandName: string; output: CommandOutput | void }) => Promise<void> | void

  'workspace:before-switch': (ctx: DesktopWorkspaceSwitchContext) => Promise<void> | void
  'workspace:switched': (payload: { from: string; to: string }) => Promise<void> | void
}
