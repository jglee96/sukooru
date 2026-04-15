import { describe, expect, it, vi } from 'vitest'
import { ContainerRegistry } from '../containerRegistry'
import { TypedEventEmitter } from '../events'
import { ScrollStateRegistry } from '../scrollStateRegistry'

describe('registries', () => {
  it('container registry가 등록과 해제를 토큰 기준으로 관리한다', () => {
    const registry = new ContainerRegistry()
    const element = document.createElement('div')
    const token = registry.register(element, 'feed')

    expect(registry.find('feed')).toBe(element)
    expect(registry.getAll()).toEqual([{ id: 'feed', element }])
    expect(registry.getRevision()).toBe(1)

    registry.unregister('feed', Symbol('feed'))
    expect(registry.find('feed')).toBe(element)

    registry.unregister('feed', token)
    expect(registry.find('feed')).toBeUndefined()
    expect(registry.getRevision()).toBe(2)

    registry.unregister('feed')
    expect(registry.getRevision()).toBe(2)
  })

  it('scroll state registry가 등록과 해제를 토큰 기준으로 관리한다', () => {
    const registry = new ScrollStateRegistry<{ page: number }>()
    const firstHandler = {
      captureState: () => ({ page: 1 }),
      applyState: vi.fn(),
    }
    const secondHandler = {
      captureState: () => ({ page: 2 }),
      applyState: vi.fn(),
    }

    const token = registry.register('feed', firstHandler)
    expect(registry.getAll()).toEqual([['feed', firstHandler]])

    registry.unregister('feed', Symbol('feed'))
    expect(registry.getAll()).toEqual([['feed', firstHandler]])

    registry.unregister('feed', token)
    expect(registry.getAll()).toEqual([])

    const nextToken = registry.register('feed', secondHandler)
    expect(registry.getAll()).toEqual([['feed', secondHandler]])

    registry.unregister('feed', nextToken)
    registry.unregister('missing')
    expect(registry.getAll()).toEqual([])
  })

  it('typed event emitter가 구독 해제를 처리한다', () => {
    const emitter = new TypedEventEmitter<unknown>()
    const handler = vi.fn()

    const off = emitter.on('mount', handler)

    emitter.emit('mount', {})
    off()
    emitter.emit('mount', {})
    emitter.emit('unmount', {})

    expect(handler).toHaveBeenCalledTimes(1)
  })
})
