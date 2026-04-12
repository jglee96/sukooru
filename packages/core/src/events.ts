import type { ScrollEntry, ScrollKey } from './types'

export type SukooruEvent =
  | 'save:before'
  | 'save:after'
  | 'save:error'
  | 'restore:before'
  | 'restore:after'
  | 'restore:miss'
  | 'restore:error'
  | 'clear'
  | 'mount'
  | 'unmount'

interface SukooruEventMap<T> {
  'save:before': { key: ScrollKey; entry: ScrollEntry<T> }
  'save:after': { key: ScrollKey; entry: ScrollEntry<T> }
  'save:error': { key: ScrollKey; entry: ScrollEntry<T>; error: unknown }
  'restore:before': { key: ScrollKey; entry: ScrollEntry<T> }
  'restore:after': { key: ScrollKey; entry: ScrollEntry<T> }
  'restore:miss': { key: ScrollKey }
  'restore:error': { key: ScrollKey; entry: ScrollEntry<T> | null; error: unknown }
  clear: { key: ScrollKey | null }
  mount: Record<string, never>
  unmount: Record<string, never>
}

export type SukooruEventPayload<E extends SukooruEvent, T> = SukooruEventMap<T>[E]

export type SukooruEventHandler<E extends SukooruEvent, T> = (
  payload: SukooruEventPayload<E, T>,
) => void

export class TypedEventEmitter<T> {
  private readonly listeners = new Map<
    SukooruEvent,
    Set<SukooruEventHandler<SukooruEvent, T>>
  >()

  emit<E extends SukooruEvent>(event: E, payload: SukooruEventPayload<E, T>): void {
    const handlers = this.listeners.get(event)
    if (!handlers) {
      return
    }

    handlers.forEach((handler) => {
      handler(payload as SukooruEventPayload<SukooruEvent, T>)
    })
  }

  on<E extends SukooruEvent>(event: E, handler: SukooruEventHandler<E, T>): () => void {
    const handlers =
      this.listeners.get(event) ?? new Set<SukooruEventHandler<SukooruEvent, T>>()

    handlers.add(handler as SukooruEventHandler<SukooruEvent, T>)
    this.listeners.set(event, handlers)

    return () => {
      this.off(event, handler)
    }
  }

  private off<E extends SukooruEvent>(event: E, handler: SukooruEventHandler<E, T>): void {
    const handlers = this.listeners.get(event)
    if (!handlers) {
      return
    }

    handlers.delete(handler as SukooruEventHandler<SukooruEvent, T>)

    if (handlers.size === 0) {
      this.listeners.delete(event)
    }
  }
}

