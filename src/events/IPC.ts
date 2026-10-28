import type { DesktopKernelEvent } from '../types'

export type EventHandler = (event: DesktopKernelEvent) => void

export class CoreIPCBus {
  private readonly maxEvents: number
  private events: DesktopKernelEvent[] = []
  private readonly listeners = new Map<string, Set<EventHandler>>()
  private eventCounter = 0
  private subscribers = new Set<(events: DesktopKernelEvent[]) => void>()

  constructor(options?: { maxEvents?: number }) {
    this.maxEvents = options?.maxEvents ?? 150
  }

  public emit(
    channel: string,
    payload?: any,
    options?: { source?: string; severity?: 'info' | 'warn' | 'error' },
  ): DesktopKernelEvent {
    this.eventCounter++
    const event: DesktopKernelEvent = {
      id: `evt-${Date.now()}-${this.eventCounter}`,
      timestamp: Date.now(),
      channel,
      source: options?.source ?? 'kernel',
      severity: options?.severity ?? 'info',
      payload,
    }

    this.events = [event, ...this.events.slice(0, this.maxEvents - 1)]

    const channelSet = this.listeners.get(channel)
    if (channelSet) {
      for (const handler of channelSet) {
        try {
          handler(event)
        } catch (err) {
          console.error(`[@owdproject/core][IPC] Error in listener for "${channel}":`, err)
        }
      }
    }

    if (channel !== '*') {
      const wildcardSet = this.listeners.get('*')
      if (wildcardSet) {
        for (const handler of wildcardSet) {
          try {
            handler(event)
          } catch (err) {
            console.error(`[@owdproject/core][IPC] Error in wildcard listener:`, err)
          }
        }
      }
    }

    // Notify state subscribers (e.g. reactive stores in Vue/React)
    for (const sub of this.subscribers) {
      try {
        sub(this.events)
      } catch {
        // ignore
      }
    }

    return event
  }

  public on(channel: string, handler: EventHandler): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set())
    }
    this.listeners.get(channel)!.add(handler)

    return () => {
      this.off(channel, handler)
    }
  }

  public off(channel: string, handler: EventHandler): void {
    const channelSet = this.listeners.get(channel)
    if (channelSet) {
      channelSet.delete(handler)
      if (channelSet.size === 0) {
        this.listeners.delete(channel)
      }
    }
  }

  public getEvents(): DesktopKernelEvent[] {
    return this.events
  }

  public getActiveChannels(): string[] {
    return Array.from(this.listeners.keys())
  }

  public clear(): void {
    this.events = []
    for (const sub of this.subscribers) {
      try {
        sub(this.events)
      } catch {
        // ignore
      }
    }
  }

  public subscribe(callback: (events: DesktopKernelEvent[]) => void): () => void {
    this.subscribers.add(callback)
    callback(this.events)
    return () => {
      this.subscribers.delete(callback)
    }
  }
}

export const globalIPCBus = new CoreIPCBus()
