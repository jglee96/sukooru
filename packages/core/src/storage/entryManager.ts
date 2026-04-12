import type { ScrollEntry, ScrollKey, StorageAdapter } from '../types'
import type { Serializer } from './serializer'

const STORAGE_PREFIX = 'sukooru:1:'

type StoredEntry<T> = {
  entry: ScrollEntry<T>
  key: ScrollKey
  storageKey: string
}

const isQuotaExceededError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === 'QuotaExceededError'
}

export class EntryManager<T> {
  private readonly maxEntries: number

  constructor(
    private readonly storage: StorageAdapter,
    private readonly serializer: Serializer<T>,
    maxEntries: number,
    private readonly ttl?: number,
  ) {
    this.maxEntries = Math.max(1, maxEntries)
  }

  set(key: ScrollKey, entry: ScrollEntry<T>): void {
    this.evictExpired()
    const storageKey = this.toStorageKey(key)
    const serialized = this.serializer.serialize(entry)

    this.writeWithEviction(storageKey, serialized)
    this.evictOverflow(storageKey)
  }

  get(key: ScrollKey): ScrollEntry<T> | null {
    const storageKey = this.toStorageKey(key)
    const entry = this.readStoredEntry(storageKey)?.entry ?? null

    if (!entry) {
      return null
    }

    if (this.isExpired(entry)) {
      this.storage.delete(storageKey)
      return null
    }

    return entry
  }

  delete(key: ScrollKey): void {
    this.storage.delete(this.toStorageKey(key))
  }

  deleteAll(): void {
    this.getStorageKeys().forEach((storageKey) => {
      this.storage.delete(storageKey)
    })
  }

  getAllKeys(): ScrollKey[] {
    this.evictExpired()
    return this.readAllEntries().map(({ key }) => key)
  }

  isExpired(entry: ScrollEntry<T>): boolean {
    return typeof this.ttl === 'number' && Date.now() - entry.savedAt > this.ttl
  }

  private writeWithEviction(storageKey: string, serialized: string): void {
    try {
      this.storage.set(storageKey, serialized)
      return
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        throw error
      }
    }

    while (true) {
      const oldestEntry = this.readOldestEntry(storageKey)
      if (!oldestEntry) {
        throw new Error('저장 공간이 부족해 스크롤 위치를 저장할 수 없습니다.')
      }

      this.storage.delete(oldestEntry.storageKey)

      try {
        this.storage.set(storageKey, serialized)
        return
      } catch (error) {
        if (!isQuotaExceededError(error)) {
          throw error
        }
      }
    }
  }

  private evictExpired(): void {
    this.readAllEntries().forEach(({ entry, storageKey }) => {
      if (this.isExpired(entry)) {
        this.storage.delete(storageKey)
      }
    })
  }

  private evictOverflow(storageKeyToKeep: string): void {
    const entries = this.readAllEntries().sort((left, right) => left.entry.savedAt - right.entry.savedAt)
    let overflow = entries.length - this.maxEntries

    for (const storedEntry of entries) {
      if (overflow <= 0) {
        return
      }

      if (storedEntry.storageKey === storageKeyToKeep) {
        continue
      }

      this.storage.delete(storedEntry.storageKey)
      overflow -= 1
    }
  }

  private readOldestEntry(storageKeyToSkip: string): StoredEntry<T> | null {
    const candidates = this.readAllEntries()
      .filter((storedEntry) => storedEntry.storageKey !== storageKeyToSkip)
      .sort((left, right) => left.entry.savedAt - right.entry.savedAt)

    return candidates[0] ?? null
  }

  private readAllEntries(): StoredEntry<T>[] {
    return this.getStorageKeys()
      .map((storageKey) => this.readStoredEntry(storageKey))
      .filter((storedEntry): storedEntry is StoredEntry<T> => storedEntry !== null)
  }

  private readStoredEntry(storageKey: string): StoredEntry<T> | null {
    const raw = this.storage.get(storageKey)
    if (!raw) {
      return null
    }

    const entry = this.serializer.deserialize(raw)
    if (!entry) {
      this.storage.delete(storageKey)
      return null
    }

    return {
      entry,
      key: this.fromStorageKey(storageKey),
      storageKey,
    }
  }

  private getStorageKeys(): string[] {
    return this.storage.keys().filter((key) => key.startsWith(STORAGE_PREFIX))
  }

  private toStorageKey(key: ScrollKey): string {
    return `${STORAGE_PREFIX}${encodeURIComponent(key)}`
  }

  private fromStorageKey(storageKey: string): ScrollKey {
    return decodeURIComponent(storageKey.slice(STORAGE_PREFIX.length))
  }
}

