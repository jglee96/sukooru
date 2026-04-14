import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSukooru } from '../createSukooru'
import { createMemoryStorageAdapter } from '../storage/memoryStorageAdapter'
import type { ScrollStateHandler } from '../types'

const setWindowScroll = (x: number, y: number): void => {
  ;(window as Window & { scrollX: number; scrollY: number }).scrollX = x
  ;(window as Window & { scrollX: number; scrollY: number }).scrollY = y
}

describe('createSukooru', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollX', {
      configurable: true,
      writable: true,
      value: 0,
    })
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0,
    })
    window.scrollTo = vi.fn((options?: ScrollToOptions | number, y?: number) => {
      if (typeof options === 'number') {
        setWindowScroll(options, y ?? 0)
        return
      }

      setWindowScroll(options?.left ?? 0, options?.top ?? 0)
    }) as typeof window.scrollTo
    document.body.innerHTML = ''
  })

  it('등록한 컨테이너의 위치를 저장하고 복원한다', async () => {
    const storage = createMemoryStorageAdapter()
    const sukooru = createSukooru<{ cursor: string }>({
      storage,
      waitForDomReady: false,
    })
    const element = document.createElement('div')
    element.scrollTop = 320
    element.scrollLeft = 24

    sukooru.registerContainer(element, 'product-list')

    await sukooru.save('products')

    element.scrollTop = 0
    element.scrollLeft = 0

    await expect(sukooru.restore('products')).resolves.toBe('restored')
    expect(element.scrollTop).toBe(320)
    expect(element.scrollLeft).toBe(24)
  })

  it('저장된 데이터가 없으면 missed 상태를 반환한다', async () => {
    const sukooru = createSukooru({
      storage: createMemoryStorageAdapter(),
      waitForDomReady: false,
    })

    await expect(sukooru.restore('missing')).resolves.toBe('missed')
  })

  it('ttl이 지난 항목은 복원하지 않는다', async () => {
    vi.useFakeTimers()
    const storage = createMemoryStorageAdapter()
    const sukooru = createSukooru({
      storage,
      ttl: 100,
      waitForDomReady: false,
    })
    const element = document.createElement('div')
    element.scrollTop = 120

    sukooru.registerContainer(element, 'feed')

    await sukooru.save('feed')
    vi.advanceTimersByTime(101)

    await expect(sukooru.restore('feed')).resolves.toBe('missed')
    vi.useRealTimers()
  })

  it('최대 저장 개수를 넘기면 가장 오래된 항목을 제거한다', async () => {
    const now = vi.spyOn(Date, 'now')
    now
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(3)

    const sukooru = createSukooru({
      storage: createMemoryStorageAdapter(),
      maxEntries: 2,
      waitForDomReady: false,
    })

    await sukooru.save('a')
    await sukooru.save('b')
    await sukooru.save('c')

    expect(sukooru.keys).toEqual(['b', 'c'])
    now.mockRestore()
  })

  it('커스텀 상태 복원에 실패해도 기본 위치 복원은 유지한다', async () => {
    const storage = createMemoryStorageAdapter()
    const sukooru = createSukooru({
      storage,
      waitForDomReady: false,
    })
    const element = document.createElement('div')
    const errors: unknown[] = []
    const stateHandler: ScrollStateHandler<{ cursor: string }> = {
      captureState: () => ({ cursor: 'page-2' }),
      applyState: async () => {
        throw new Error('복원 실패')
      },
    }

    sukooru.on('restore:error', ({ error }) => {
      errors.push(error)
    })
    sukooru.registerContainer(element, 'infinite')
    sukooru.setScrollStateHandler('infinite', stateHandler)

    element.scrollTop = 480
    await sukooru.save('infinite')

    element.scrollTop = 0
    await expect(sukooru.restore('infinite')).resolves.toBe('restored')

    expect(errors).toHaveLength(1)
    expect(element.scrollTop).toBe(480)
  })

  it('popstate 시 출발 키를 저장하고 도착 키를 복원한다', async () => {
    const storage = createMemoryStorageAdapter()
    let currentKey = 'https://example.com/list'
    const sukooru = createSukooru({
      storage,
      getKey: () => currentKey,
      waitForDomReady: false,
    })

    sukooru.registerContainer(window, 'window')

    setWindowScroll(0, 640)
    await sukooru.save('https://example.com/detail')

    setWindowScroll(0, 180)
    const cleanup = sukooru.mount()

    currentKey = 'https://example.com/detail'
    window.dispatchEvent(new PopStateEvent('popstate'))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(window.scrollY).toBe(640)

    const verifier = createSukooru({
      storage,
      waitForDomReady: false,
    })
    verifier.registerContainer(window, 'window')
    setWindowScroll(0, 0)

    await verifier.restore('https://example.com/list')
    expect(window.scrollY).toBe(180)

    cleanup()
  })

  it('pushState 뒤 브라우저 뒤로가기에서도 현재 키를 올바르게 추적한다', async () => {
    const storage = createMemoryStorageAdapter()
    let currentKey = '/products'

    const sukooru = createSukooru({
      storage,
      getKey: () => currentKey,
      waitForDomReady: false,
    })

    sukooru.registerContainer(window, 'window')

    setWindowScroll(0, 420)
    await sukooru.save('/products')

    const cleanup = sukooru.mount()

    currentKey = '/products/7'
    window.history.pushState({}, '', '/products/7')
    setWindowScroll(0, 0)
    currentKey = '/products'
    window.dispatchEvent(new PopStateEvent('popstate'))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(window.scrollY).toBe(420)

    cleanup()
  })

  it('여러 인스턴스가 마운트돼도 history patch를 안전하게 공유한다', () => {
    const nativePushState = window.history.pushState
    const nativeReplaceState = window.history.replaceState
    const first = createSukooru({
      storage: createMemoryStorageAdapter(),
      getKey: () => '/first',
      waitForDomReady: false,
    })
    const second = createSukooru({
      storage: createMemoryStorageAdapter(),
      getKey: () => '/second',
      waitForDomReady: false,
    })

    const cleanupFirst = first.mount()
    const patchedPushState = window.history.pushState
    const patchedReplaceState = window.history.replaceState

    const cleanupSecond = second.mount()

    expect(window.history.pushState).toBe(patchedPushState)
    expect(window.history.replaceState).toBe(patchedReplaceState)

    cleanupFirst()

    expect(window.history.pushState).toBe(patchedPushState)
    expect(window.history.replaceState).toBe(patchedReplaceState)

    cleanupSecond()

    expect(window.history.pushState).toBe(nativePushState)
    expect(window.history.replaceState).toBe(nativeReplaceState)
  })

  it('cleanup 시점에 더 최신의 history patch가 있으면 덮어쓰지 않는다', () => {
    const nativePushState = window.history.pushState
    const nativeReplaceState = window.history.replaceState
    const sukooru = createSukooru({
      storage: createMemoryStorageAdapter(),
      waitForDomReady: false,
    })
    const cleanup = sukooru.mount()

    const externalPushState = ((...args: Parameters<History['pushState']>) => {
      nativePushState.apply(window.history, args)
    }) as History['pushState']
    const externalReplaceState = ((...args: Parameters<History['replaceState']>) => {
      nativeReplaceState.apply(window.history, args)
    }) as History['replaceState']

    window.history.pushState = externalPushState
    window.history.replaceState = externalReplaceState

    cleanup()

    expect(window.history.pushState).toBe(externalPushState)
    expect(window.history.replaceState).toBe(externalReplaceState)

    window.history.pushState = nativePushState
    window.history.replaceState = nativeReplaceState
  })

  it('같은 키에 대한 중복 복원 요청은 하나의 작업으로 합친다', async () => {
    vi.useFakeTimers()

    const storage = createMemoryStorageAdapter()
    const restoreBeforeEvents: string[] = []
    const sukooru = createSukooru({
      storage,
      restoreDelay: 20,
      waitForDomReady: false,
    })

    sukooru.registerContainer(window, 'window')
    sukooru.on('restore:before', ({ key }) => {
      restoreBeforeEvents.push(key)
    })

    setWindowScroll(0, 360)
    await sukooru.save('/products')

    setWindowScroll(0, 0)

    const firstRestore = sukooru.restore('/products')
    const secondRestore = sukooru.restore('/products')

    vi.advanceTimersByTime(20)
    await Promise.resolve()
    await Promise.resolve()

    await expect(firstRestore).resolves.toBe('restored')
    await expect(secondRestore).resolves.toBe('restored')
    expect(restoreBeforeEvents).toEqual(['/products'])
    expect(window.scrollY).toBe(360)

    vi.useRealTimers()
  })

  it('복원 도중 컨테이너가 다시 등록되면 같은 키 복원을 다시 시작한다', async () => {
    vi.useFakeTimers()

    const storage = createMemoryStorageAdapter()
    const restoreBeforeEvents: string[] = []
    const sukooru = createSukooru({
      storage,
      restoreDelay: 20,
      waitForDomReady: false,
    })

    const initialHandle = sukooru.registerContainer(window, 'window')
    setWindowScroll(0, 540)
    await sukooru.save('/products')

    initialHandle.unregister()
    setWindowScroll(0, 0)

    sukooru.on('restore:before', ({ key }) => {
      restoreBeforeEvents.push(key)
    })

    const firstRestore = sukooru.restore('/products')

    const mountedHandle = sukooru.registerContainer(window, 'window')
    const secondRestore = sukooru.restore('/products')

    vi.advanceTimersByTime(20)
    await Promise.resolve()
    await Promise.resolve()

    await expect(firstRestore).resolves.toBe('idle')
    await expect(secondRestore).resolves.toBe('restored')
    expect(restoreBeforeEvents).toEqual(['/products', '/products'])
    expect(window.scrollY).toBe(540)

    mountedHandle.unregister()
    vi.useRealTimers()
  })

  it('clear와 clearAll이 저장 항목을 정리한다', async () => {
    const sukooru = createSukooru({
      storage: createMemoryStorageAdapter(),
      waitForDomReady: false,
      getKey: () => 'current',
    })

    await sukooru.save('one')
    await sukooru.save('two')

    sukooru.clear('one')
    expect(sukooru.keys).toEqual(['two'])
    expect(sukooru.currentKey).toBe('current')

    sukooru.clearAll()
    expect(sukooru.keys).toEqual([])
  })
})
