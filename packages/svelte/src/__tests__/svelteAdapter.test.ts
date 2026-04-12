import { get } from 'svelte/store'
import { describe, expect, it, vi } from 'vitest'
import type {
  ContainerHandle,
  ScrollRestoreStatus,
  ScrollStateHandler,
  SukooruInstance,
} from 'sukooru-core'
import {
  createScrollRestore,
  createSukooruProvider,
  createVirtualScrollRestore,
  type VirtualScrollState,
} from '../index'

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
  await Promise.resolve()
}

describe('sukooru-svelte', () => {
  it('provider가 mount 정리 함수를 연결한다', () => {
    const cleanup = vi.fn()
    const instance = createMockInstance()
    instance.mount.mockReturnValue(cleanup)

    const provider = createSukooruProvider({ instance })

    expect(instance.mount).toHaveBeenCalledTimes(1)
    expect(provider.instance).toBe(instance)

    provider.destroy()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('action이 컨테이너 등록과 복원, 저장을 관리한다', async () => {
    const instance = createMockInstance()
    const containerHandle = createHandle()
    instance.registerContainer.mockReturnValue(containerHandle)
    instance.restore.mockResolvedValue('restored' satisfies ScrollRestoreStatus)
    const controller = createScrollRestore(instance)
    const node = document.createElement('div')

    const action = controller.action(node, {
      containerId: 'product-list',
      scrollKey: 'products',
    })

    await flush()

    expect(get(controller.status)).toBe('restored')
    expect(instance.registerContainer).toHaveBeenCalledTimes(1)
    expect(instance.restore).toHaveBeenCalledWith('products')

    action.destroy?.()

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
    const controller = createScrollRestore(instance)
    const node = document.createElement('div')
    const action = controller.action(node, {
      containerId: 'timeline',
      stateHandler: firstHandler,
    })

    await flush()
    action.update?.({
      containerId: 'timeline',
      stateHandler: secondHandler,
    })

    expect(instance.setScrollStateHandler).toHaveBeenCalledTimes(2)
    expect(instance.registerContainer).toHaveBeenCalledTimes(1)
  })

  it('복원 중 destroy에서는 저장으로 기존 위치를 덮어쓰지 않는다', async () => {
    let resolveRestore: ((status: ScrollRestoreStatus) => void) | null = null
    const instance = createMockInstance()
    const controller = createScrollRestore(instance)
    const node = document.createElement('div')

    instance.restore.mockImplementation(
      () =>
        new Promise<ScrollRestoreStatus>((resolve) => {
          resolveRestore = resolve
        }),
    )

    const action = controller.action(node, {
      containerId: 'product-list',
      scrollKey: 'products',
    })

    expect(instance.save).not.toHaveBeenCalled()

    action.destroy?.()
    expect(instance.save).not.toHaveBeenCalled()

    resolveRestore?.('restored')
    await flush()
  })

  it('virtual action도 scrollKey를 save/restore에 그대로 전달한다', async () => {
    const instance = createMockInstance() as SukooruInstance<VirtualScrollState> & {
      restore: ReturnType<typeof vi.fn>
      save: ReturnType<typeof vi.fn>
    }
    instance.restore.mockResolvedValue('restored' satisfies ScrollRestoreStatus)
    const controller = createVirtualScrollRestore(instance)
    const node = document.createElement('div')
    const action = controller.action(node, {
      containerId: 'virtual-list',
      scrollKey: '/virtual',
      virtualizer: {
        scrollOffset: 320,
        options: { count: 24 },
        getVirtualItems: () => [{ index: 4 }],
        scrollToOffset: vi.fn(),
      },
    })

    await flush()

    expect(get(controller.status)).toBe('restored')
    expect(instance.restore).toHaveBeenCalledWith('/virtual')

    action.destroy?.()
    expect(instance.save).toHaveBeenCalledWith('/virtual')
  })
})
