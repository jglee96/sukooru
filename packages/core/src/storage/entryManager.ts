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

  async set(key: ScrollKey, entry: ScrollEntry<T>): Promise<void> {
    await this.evictExpired()
    const storageKey = this.toStorageKey(key)
    const serialized = this.serializer.serialize(entry)

    await this.writeWithEviction(storageKey, serialized)
    await this.evictOverflow(storageKey)
  }

  async get(key: ScrollKey): Promise<ScrollEntry<T> | null> {
    const storageKey = this.toStorageKey(key)
    const entry = (await this.readStoredEntry(storageKey))?.entry ?? null

    if (!entry) {
      return null
    }

    if (this.isExpired(entry)) {
      await this.storage.delete(storageKey)
      return null
    }

    return entry
  }

  async delete(key: ScrollKey): Promise<void> {
    await this.storage.delete(this.toStorageKey(key))
  }

  async deleteAll(): Promise<void> {
    const storageKeys = await this.getStorageKeys()

    await Promise.all(storageKeys.map((storageKey) => this.storage.delete(storageKey)))
  }

  async getAllKeys(): Promise<ScrollKey[]> {
    await this.evictExpired()
    return (await this.readAllEntries()).map(({ key }) => key)
  }

  isExpired(entry: ScrollEntry<T>): boolean {
    return typeof this.ttl === 'number' && Date.now() - entry.savedAt > this.ttl
  }

  private async writeWithEviction(storageKey: string, serialized: string): Promise<void> {
    try {
      await this.storage.set(storageKey, serialized)
      return
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        throw error
      }
    }

    while (true) {
      const oldestEntry = await this.readOldestEntry(storageKey)
      if (!oldestEntry) {
        throw new Error('저장 공간이 부족해 스크롤 위치를 저장할 수 없습니다.')
      }

      await this.storage.delete(oldestEntry.storageKey)

      try {
        await this.storage.set(storageKey, serialized)
        return
      } catch (error) {
        if (!isQuotaExceededError(error)) {
          throw error
        }
      }
    }
  }

  private async evictExpired(): Promise<void> {
    const entries = await this.readAllEntries()

    await Promise.all(entries.map(async ({ entry, storageKey }) => {
      if (this.isExpired(entry)) {
        await this.storage.delete(storageKey)
      }
    }))
  }

  private async evictOverflow(storageKeyToKeep: string): Promise<void> {
    const entries = (await this.readAllEntries()).sort(
      (left, right) => left.entry.savedAt - right.entry.savedAt,
    )
    let overflow = entries.length - this.maxEntries

    for (const storedEntry of entries) {
      if (overflow <= 0) {
        return
      }

      if (storedEntry.storageKey === storageKeyToKeep) {
        continue
      }

      await this.storage.delete(storedEntry.storageKey)
      overflow -= 1
    }
  }

  private async readOldestEntry(storageKeyToSkip: string): Promise<StoredEntry<T> | null> {
    const candidates = (await this.readAllEntries())
      .filter((storedEntry) => storedEntry.storageKey !== storageKeyToSkip)
      .sort((left, right) => left.entry.savedAt - right.entry.savedAt)

    return candidates[0] ?? null
  }

  private async readAllEntries(): Promise<StoredEntry<T>[]> {
    const storageKeys = await this.getStorageKeys()

    return (await Promise.all(storageKeys.map((storageKey) => this.readStoredEntry(storageKey))))
      .filter((storedEntry): storedEntry is StoredEntry<T> => storedEntry !== null)
  }

  private async readStoredEntry(storageKey: string): Promise<StoredEntry<T> | null> {
    const raw = await this.storage.get(storageKey)
    if (!raw) {
      return null
    }

    const entry = this.serializer.deserialize(raw)
    if (!entry) {
      await this.storage.delete(storageKey)
      return null
    }

    return {
      entry,
      key: this.fromStorageKey(storageKey),
      storageKey,
    }
  }

  private async getStorageKeys(): Promise<string[]> {
    return (await this.storage.keys()).filter((key) => key.startsWith(STORAGE_PREFIX))
  }

  private toStorageKey(key: ScrollKey): string {
    return `${STORAGE_PREFIX}${encodeURIComponent(key)}`
  }

  private fromStorageKey(storageKey: string): ScrollKey {
    return decodeURIComponent(storageKey.slice(STORAGE_PREFIX.length))
  }
}
