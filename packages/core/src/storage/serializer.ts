import type { ScrollEntry, ScrollPosition } from '../types'

export interface Serializer<T> {
  serialize: (entry: ScrollEntry<T>) => string
  deserialize: (raw: string) => ScrollEntry<T> | null
}

const isScrollPosition = (value: unknown): value is ScrollPosition => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<ScrollPosition>

  return (
    typeof candidate.containerId === 'string' &&
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number'
  )
}

export const createDefaultSerializer = <T>(): Serializer<T> => ({
  serialize(entry) {
    return JSON.stringify(entry)
  },
  deserialize(raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<ScrollEntry<T>>
      if (typeof parsed.savedAt !== 'number') {
        return null
      }

      if (!Array.isArray(parsed.positions) || !parsed.positions.every(isScrollPosition)) {
        return null
      }

      if (
        parsed.customState !== null &&
        parsed.customState !== undefined &&
        typeof parsed.customState !== 'object'
      ) {
        return null
      }

      return {
        savedAt: parsed.savedAt,
        positions: parsed.positions,
        customState: (parsed.customState ?? null) as ScrollEntry<T>['customState'],
      }
    } catch {
      return null
    }
  },
})

