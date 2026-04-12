import type { StorageAdapter } from '../types'

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export const sessionStorageAdapter: StorageAdapter = {
  get(key) {
    return getStorage()?.getItem(key) ?? null
  },
  set(key, value) {
    getStorage()?.setItem(key, value)
  },
  delete(key) {
    getStorage()?.removeItem(key)
  },
  keys() {
    const storage = getStorage()
    if (!storage) {
      return []
    }

    return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
      (key): key is string => key !== null,
    )
  },
}

