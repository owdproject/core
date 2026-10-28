import type { Hookable } from 'hookable'
import type { CommandOutput, DesktopCommand, DesktopRuntimeHooks } from '../types'
import { parseCommandLine } from './commandParser'
import { globalDesktopHooks } from './DesktopHooks'
import { CoreIPCBus, globalIPCBus } from './IPC'

export type DesktopCommandHandler = (
  args: string[],
  rawInput: string,
) => Promise<CommandOutput | string | void> | CommandOutput | string | void

export interface RegisteredDesktopCommand extends DesktopCommand {
  handler: DesktopCommandHandler
}

export class DesktopCommands {
  private commands = new Map<string, RegisteredDesktopCommand>()
  private snapshotCache: readonly DesktopCommand[] = Object.freeze([])
  private subscribers = new Set<(commands: DesktopCommand[]) => void>()
  private hooks: Hookable<DesktopRuntimeHooks>
  private ipc: CoreIPCBus

  constructor(options?: {
    hooks?: Hookable<DesktopRuntimeHooks>
    ipc?: CoreIPCBus
  }) {
    this.hooks = options?.hooks ?? globalDesktopHooks
    this.ipc = options?.ipc ?? globalIPCBus
  }

  public getSnapshot(): DesktopCommand[] {
    return this.snapshotCache as DesktopCommand[]
  }

  public subscribe(callback: (commands: DesktopCommand[]) => void): () => void {
    this.subscribers.add(callback)
    callback(this.getSnapshot())
    return () => {
      this.subscribers.delete(callback)
    }
  }

  private notify(): void {
    this.snapshotCache = Object.freeze(
      Array.from(this.commands.values()).map(({ handler: _h, ...meta }) => Object.freeze({ ...meta })),
    )
    const snapshot = this.getSnapshot()
    for (const sub of this.subscribers) {
      try {
        sub(snapshot)
      } catch {
        // ignore
      }
    }
  }

  public register(command: DesktopCommand, handler: DesktopCommandHandler): () => void {
    this.commands.set(command.name, {
      ...command,
      handler,
    })
    this.notify()
    return () => {
      this.unregister(command.name)
    }
  }

  public unregister(name: string): boolean {
    const deleted = this.commands.delete(name)
    if (deleted) {
      this.notify()
    }
    return deleted
  }

  public has(name: string): boolean {
    return this.commands.has(name)
  }

  public getCommands(): DesktopCommand[] {
    return this.getSnapshot()
  }

  public async exec(input: string): Promise<CommandOutput | void> {
    const { name, args } = parseCommandLine(input)
    if (!name) return undefined

    const execCtx = {
      input,
      commandName: name,
      args,
      cancel: false,
      overrideOutput: undefined as CommandOutput | undefined,
    }

    await this.hooks.callHook('command:before-exec', execCtx)
    if (execCtx.cancel) {
      return execCtx.overrideOutput ?? {
        message: `Command "${name}" execution cancelled by policy.`,
        isError: true,
      }
    }

    const registered = this.commands.get(name)
    if (!registered) {
      const notFoundOutput: CommandOutput = {
        message: `${name}: command not found`,
        isError: true,
      }
      await this.hooks.callHook('command:after-exec', {
        input,
        commandName: name,
        output: notFoundOutput,
      })
      return notFoundOutput
    }

    try {
      const result = await registered.handler(args, input)
      const output: CommandOutput | void =
        typeof result === 'string' ? { message: result, isError: false } : result

      this.ipc.emit('command:executed', { command: name, args }, { source: 'commands' })
      await this.hooks.callHook('command:after-exec', {
        input,
        commandName: name,
        output,
      })
      return output
    } catch (err: any) {
      const errorOutput: CommandOutput = {
        message: err?.message || String(err),
        isError: true,
      }
      await this.hooks.callHook('command:after-exec', {
        input,
        commandName: name,
        output: errorOutput,
      })
      return errorOutput
    }
  }
}
