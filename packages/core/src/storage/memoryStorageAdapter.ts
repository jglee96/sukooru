import type { StorageAdapter } from '../types'

export const createMemoryStorageAdapter = (): StorageAdapter => {
  const store = new Map<string, string>()

  return {
    get(key) {
      return store.get(key) ?? null
    },
    set(key, value) {
      store.set(key, value)
    },
    delete(key) {
      store.delete(key)
    },
    keys() {
      return Array.from(store.keys())
    },
  }
}

