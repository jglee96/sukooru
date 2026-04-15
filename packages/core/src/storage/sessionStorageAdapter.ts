import type { StorageAdapter } from '../types'
import { createMemoryStorageAdapter } from './memoryStorageAdapter'

export interface CreateSessionStorageAdapterOptions {
  fallbackStorage?: StorageAdapter
  onFallback?: (error: unknown) => void
}

const FALLBACK_WARNING =
  'Sukooru could not access sessionStorage and is falling back to in-memory storage for this page session.'

const isQuotaExceededError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === 'QuotaExceededError'
}

const isWebStorage = (storage: Storage | StorageAdapter): storage is Storage => {
  return 'getItem' in storage
}

const readStorageKeys = (storage: Storage): string[] => {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (key): key is string => key !== null,
  )
}

export const createSessionStorageAdapter = ({
  fallbackStorage = createMemoryStorageAdapter(),
  onFallback,
}: CreateSessionStorageAdapterOptions = {}): StorageAdapter => {
  let usesFallback = false
  let warnedFallback = false

  const reportFallback = (error: unknown): void => {
    if (warnedFallback) {
      return
    }

    warnedFallback = true

    if (onFallback) {
      onFallback(error)
      return
    }

    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(FALLBACK_WARNING, error)
    }
  }

  const activateFallback = (error: unknown): StorageAdapter => {
    usesFallback = true
    reportFallback(error)
    return fallbackStorage
  }

  const getActiveStorage = (): Storage | StorageAdapter => {
    if (usesFallback) {
      return fallbackStorage
    }

    if (typeof window === 'undefined') {
      return fallbackStorage
    }

    try {
      return window.sessionStorage
    } catch (error) {
      return activateFallback(error)
    }
  }

  return {
    get(key) {
      const storage = getActiveStorage()

      if (!isWebStorage(storage)) {
        return storage.get(key)
      }

      try {
        return storage.getItem(key)
      } catch (error) {
        if (isQuotaExceededError(error)) {
          throw error
        }

        return activateFallback(error).get(key)
      }
    },
    set(key, value) {
      const storage = getActiveStorage()

      if (!isWebStorage(storage)) {
        storage.set(key, value)
        return
      }

      try {
        storage.setItem(key, value)
      } catch (error) {
        if (isQuotaExceededError(error)) {
          throw error
        }

        activateFallback(error).set(key, value)
      }
    },
    delete(key) {
      const storage = getActiveStorage()

      if (!isWebStorage(storage)) {
        storage.delete(key)
        return
      }

      try {
        storage.removeItem(key)
      } catch (error) {
        if (isQuotaExceededError(error)) {
          throw error
        }

        activateFallback(error).delete(key)
      }
    },
    keys() {
      const storage = getActiveStorage()

      if (!isWebStorage(storage)) {
        return storage.keys()
      }

      try {
        return readStorageKeys(storage)
      } catch (error) {
        if (isQuotaExceededError(error)) {
          throw error
        }

        return activateFallback(error).keys()
      }
    },
  }
}

export const sessionStorageAdapter: StorageAdapter = createSessionStorageAdapter()
