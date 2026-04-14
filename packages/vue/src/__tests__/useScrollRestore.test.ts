import { createApp, defineComponent, h, nextTick, shallowRef } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ContainerHandle,
  ScrollRestoreStatus,
  ScrollStateHandler,
  SukooruInstance,
} from '@sukooru/core'
import { createSukooruPlugin } from '../plugin'
import { useScrollRestore } from '../useScrollRestore'

const createHandle = (): ContainerHandle => ({
  unregister: vi.fn(),
})

const createMockInstance = (): SukooruInstance<unknown> & {
  mount: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  registerContainer: ReturnType<typeof vi.fn>
  setScrollStateHandler: ReturnType<typeof vi.fn>
} => {
  const instance: SukooruInstance<unknown> = {
    save: async () => {},
    restore: async () => 'idle',
    clear: () => {},
    clearAll: () => {},
    getKeys: async () => [],
    registerContainer: () => createHandle(),
    setScrollStateHandler: () => createHandle(),
    on: () => () => {},
    mount: () => () => {},
    get keys() {
      return []
    },
    get currentKey() {
      return 'current'
    },
  }

  return {
    ...instance,
    mount: vi.fn(instance.mount),
    restore: vi.fn(instance.restore),
    save: vi.fn(instance.save),
    registerContainer: vi.fn(instance.registerContainer),
    setScrollStateHandler: vi.fn(instance.setScrollStateHandler),
  }
}

const flush = async () => {
  await Promise.resolve()
  await nextTick()
}

describe('@sukooru/vue', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('plugin이 mount 정리 함수를 연결한다', () => {
    const cleanup = vi.fn()
    const instance = createMockInstance()
    instance.mount.mockReturnValue(cleanup)
    const root = document.createElement('div')
    const app = createApp({
      render: () => h('div'),
    })

    app.use(createSukooruPlugin({ instance }))
    app.mount(root)

    expect(instance.mount).toHaveBeenCalledTimes(1)

    app.unmount()

    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('컴포저블이 컨테이너 등록과 복원, 저장을 관리한다', async () => {
    const instance = createMockInstance()
    const containerHandle = createHandle()
    instance.registerContainer.mockReturnValue(containerHandle)
    instance.restore.mockResolvedValue('restored' satisfies ScrollRestoreStatus)
    const host = document.createElement('div')

    const app = createApp(
      defineComponent(() => {
        const { containerRef, status } = useScrollRestore({
          containerId: 'product-list',
          scrollKey: 'products',
        })

        return () =>
          h('div', {
            ref: containerRef,
            'data-status': status.value,
          })
      }),
    )

    app.use(createSukooruPlugin({ instance }))
    app.mount(host)

    await flush()

    expect(host.firstElementChild?.getAttribute('data-status')).toBe('restored')
    expect(instance.registerContainer).toHaveBeenCalledTimes(1)
    expect(instance.restore).toHaveBeenCalledWith('products')

    app.unmount()

    expect(instance.save).toHaveBeenCalledWith('products')
    expect(containerHandle.unregister).toHaveBeenCalledTimes(1)
  })

  it('상태 핸들러가 바뀌어도 컨테이너는 다시 등록하지 않는다', async () => {
    const instance = createMockInstance()
    instance.restore.mockResolvedValue('restored' satisfies ScrollRestoreStatus)
    const firstHandler: ScrollStateHandler<{ page: number }> = {
      captureState: () => ({ page: 1 }),
      applyState: () => {},
    }
    const secondHandler: ScrollStateHandler<{ page: number }> = {
      captureState: () => ({ page: 2 }),
      applyState: () => {},
    }
    const stateHandlerRef = shallowRef<ScrollStateHandler<{ page: number }> | undefined>(
      firstHandler,
    )
    const host = document.createElement('div')

    const app = createApp(
      defineComponent(() => {
        const { containerRef } = useScrollRestore({
          containerId: 'timeline',
          stateHandler: stateHandlerRef,
        })

        return () => h('div', { ref: containerRef })
      }),
    )

    app.use(createSukooruPlugin({ instance }))
    app.mount(host)

    await flush()
    expect(instance.setScrollStateHandler).toHaveBeenCalledTimes(1)

    stateHandlerRef.value = secondHandler
    await flush()

    expect(instance.setScrollStateHandler).toHaveBeenCalledTimes(2)
    expect(instance.registerContainer).toHaveBeenCalledTimes(1)

    app.unmount()
  })

  it('복원 중 unmount에서는 저장으로 기존 위치를 덮어쓰지 않는다', async () => {
    let resolveRestore: ((status: ScrollRestoreStatus) => void) | null = null
    const instance = createMockInstance()
    const host = document.createElement('div')

    instance.restore.mockImplementation(
      () =>
        new Promise<ScrollRestoreStatus>((resolve) => {
          resolveRestore = resolve
        }),
    )

    const app = createApp(
      defineComponent(() => {
        const { containerRef } = useScrollRestore({
          containerId: 'product-list',
          scrollKey: 'products',
        })

        return () => h('div', { ref: containerRef })
      }),
    )

    app.use(createSukooruPlugin({ instance }))
    app.mount(host)

    expect(instance.save).not.toHaveBeenCalled()

    app.unmount()
    expect(instance.save).not.toHaveBeenCalled()

    const finishRestore = resolveRestore
    finishRestore?.('restored')
    await flush()
  })
})
