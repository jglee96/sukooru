import type { SukooruEvent, SukooruEventHandler } from './events'

export type ScrollKey = string

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
}

export type ScrollRestoreStatus = 'idle' | 'restoring' | 'restored' | 'missed'

export interface ScrollStateHandler<T = unknown> {
  captureState: () => T
  applyState: (state: T) => void | Promise<void>
}

export interface StorageAdapter {
  get: (key: string) => string | null
  set: (key: string, value: string) => void
  delete: (key: string) => void
  keys: () => string[]
}

export interface SukooruOptions<T = unknown> {
  getKey?: () => ScrollKey
  storage?: StorageAdapter
  ttl?: number
  maxEntries?: number
  hooks?: ScrollHooks<T>
  restoreDelay?: number
  waitForDomReady?: boolean
}

export interface ContainerHandle {
  unregister: () => void
}

export interface SukooruInstance<T = unknown> {
  save: (key?: ScrollKey) => Promise<void>
  restore: (key?: ScrollKey) => Promise<ScrollRestoreStatus>
  clear: (key?: ScrollKey) => void
  clearAll: () => void
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

