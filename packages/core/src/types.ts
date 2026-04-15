import type { SukooruEvent, SukooruEventHandler } from './events'

export type ScrollKey = string
export type MaybePromise<T> = T | Promise<T>

export interface ScrollPosition {
  containerId: string
  x: number
  y: number
}

export type ScrollCustomState<T> = Record<string, T>

export interface ScrollEntry<T = unknown> {
  savedAt: number
  positions: ScrollPosition[]
  customState: ScrollCustomState<T> | null
}

export interface ScrollHooks<T = unknown> {
  onBeforeSave?: (context: {
    key: ScrollKey
    entry: ScrollEntry<T>
    cancel: () => void
  }) => void
  onBeforeRestore?: (context: {
    key: ScrollKey
    entry: ScrollEntry<T>
    cancel: () => void
  }) => void
  onError?: (context: SukooruErrorContext<T>) => void
}

export type ScrollRestoreStatus = 'idle' | 'restoring' | 'restored' | 'missed'

export type SukooruErrorPhase = 'save' | 'restore' | 'restore:custom-state' | 'keys'

export interface SukooruErrorContext<T = unknown> {
  phase: SukooruErrorPhase
  key: ScrollKey | null
  entry: ScrollEntry<T> | null
  error: unknown
}

export interface ScrollStateHandler<T = unknown> {
  captureState: () => T
  applyState: (state: T) => void | Promise<void>
}

export interface StorageAdapter {
  get: (key: string) => MaybePromise<string | null>
  set: (key: string, value: string) => MaybePromise<void>
  delete: (key: string) => MaybePromise<void>
  keys: () => MaybePromise<string[]>
}

export interface SukooruOptions<T = unknown> {
  getKey?: () => ScrollKey
  storage?: StorageAdapter
  ttl?: number
  maxEntries?: number
  hooks?: ScrollHooks<T>
  restoreDelay?: number
  waitForDomReady?: boolean
  strict?: boolean
}

export interface ContainerHandle {
  unregister: () => void
}

export interface SukooruInstance<T = unknown> {
  save: (key?: ScrollKey) => Promise<void>
  restore: (key?: ScrollKey) => Promise<ScrollRestoreStatus>
  clear: (key?: ScrollKey) => MaybePromise<void>
  clearAll: () => MaybePromise<void>
  getKeys: () => Promise<ScrollKey[]>
  registerContainer: (element: Element | Window, id: string) => ContainerHandle
  setScrollStateHandler: (
    containerId: string,
    handler: ScrollStateHandler<T>,
  ) => ContainerHandle
  on: <E extends SukooruEvent>(
    event: E,
    handler: SukooruEventHandler<E, T>,
  ) => () => void
  mount: () => () => void
  readonly keys: ScrollKey[]
  readonly currentKey: ScrollKey
}
