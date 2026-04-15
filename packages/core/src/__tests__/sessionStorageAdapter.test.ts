import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSessionStorageAdapter } from '../storage/sessionStorageAdapter'

const originalSessionStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')

const createThrowingStorage = (name: string): Storage => {
  return {
    get length() {
      return 0
    },
    clear: vi.fn(),
    getItem: vi.fn(() => null),
    key: vi.fn(() => null),
    removeItem: vi.fn(),
    setItem: vi.fn(() => {
      throw new DOMException(name, name)
    }),
  }
}

describe('createSessionStorageAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks()

    if (originalSessionStorageDescriptor) {
      Object.defineProperty(window, 'sessionStorage', originalSessionStorageDescriptor)
    }
  })

  it('sessionStorage 접근이 막히면 in-memory storage로 fallback한다', () => {
    const onFallback = vi.fn()
    const adapter = createSessionStorageAdapter({ onFallback })

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError')
      },
    })

    adapter.set('products', 'saved')

    expect(adapter.get('products')).toBe('saved')
    expect(adapter.keys()).toEqual(['products'])
    expect(onFallback).toHaveBeenCalledTimes(1)
  })

  it('sessionStorage write가 security error를 던져도 fallback storage로 저장한다', () => {
    const onFallback = vi.fn()
    const adapter = createSessionStorageAdapter({ onFallback })

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: createThrowingStorage('SecurityError'),
    })

    adapter.set('feed', 'saved')

    expect(adapter.get('feed')).toBe('saved')
    expect(onFallback).toHaveBeenCalledTimes(1)
  })

  it('quota exceeded error는 그대로 다시 던져 eviction 로직이 처리하게 한다', () => {
    const adapter = createSessionStorageAdapter()

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: createThrowingStorage('QuotaExceededError'),
    })

    let capturedError: unknown = null

    try {
      adapter.set('feed', 'saved')
    } catch (error) {
      capturedError = error
    }

    expect(capturedError).toBeInstanceOf(DOMException)
    expect((capturedError as DOMException).name).toBe('QuotaExceededError')
    expect(adapter.get('feed')).toBeNull()
  })
})
