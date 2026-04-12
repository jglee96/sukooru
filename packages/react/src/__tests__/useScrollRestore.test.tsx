import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type {
  ContainerHandle,
  ScrollRestoreStatus,
  ScrollStateHandler,
  SukooruInstance,
} from '@sukooru/core'
import { SukooruProvider } from '../SukooruProvider'
import { useScrollRestore } from '../useScrollRestore'
import { useSukooru } from '../useSukooru'
import { useVirtualScrollRestore } from '../useVirtualScrollRestore'

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

const HookConsumer = ({
  containerId = 'feed',
  scrollKey,
  stateHandler,
}: {
  containerId?: string
  scrollKey?: string
  stateHandler?: ScrollStateHandler<{ page: number }>
}) => {
  const { ref, status } = useScrollRestore({
    containerId,
    scrollKey,
    stateHandler,
  })

  return <div ref={ref as unknown as React.Ref<HTMLDivElement>} data-status={status} data-testid="container" />
}

const VirtualHookConsumer = ({
  scrollKey,
}: {
  scrollKey?: string
}) => {
  const virtualizer = {
    scrollOffset: 320,
    options: {
      count: 24,
    },
    getVirtualItems: () => [{ index: 4 }],
    scrollToOffset: vi.fn(),
  }

  const { ref, status } = useVirtualScrollRestore({
    containerId: 'virtual-list',
    scrollKey,
    virtualizer,
  })

  return (
    <div
      ref={ref as unknown as React.Ref<HTMLDivElement>}
      data-status={status}
      data-testid="virtual-container"
    />
  )
}

describe('@sukooru/react', () => {
  it('provider가 mount 정리 함수를 연결한다', () => {
    const cleanup = vi.fn()
    const instance = createMockInstance()
    instance.mount.mockReturnValue(cleanup)

    const Consumer = () => {
      const sukooru = useSukooru()
      return <span>{sukooru.currentKey}</span>
    }

    const view = render(
      <SukooruProvider instance={instance}>
        <Consumer />
      </SukooruProvider>,
    )

    expect(instance.mount).toHaveBeenCalledTimes(1)
    expect(screen.getByText('current')).toBeInTheDocument()

    view.unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('훅이 컨테이너 등록과 복원, 저장을 관리한다', async () => {
    const instance = createMockInstance()
    const containerHandle = createHandle()
    instance.registerContainer.mockReturnValue(containerHandle)
    instance.restore.mockResolvedValue('restored' satisfies ScrollRestoreStatus)

    const view = render(
      <SukooruProvider instance={instance}>
        <HookConsumer containerId="product-list" scrollKey="products" />
      </SukooruProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('container')).toHaveAttribute('data-status', 'restored')
    })

    expect(instance.registerContainer).toHaveBeenCalledTimes(1)
    expect(instance.restore).toHaveBeenCalledWith('products')

    view.unmount()

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

    const view = render(
      <SukooruProvider instance={instance}>
        <HookConsumer containerId="timeline" stateHandler={firstHandler} />
      </SukooruProvider>,
    )

    await waitFor(() => {
      expect(instance.setScrollStateHandler).toHaveBeenCalledTimes(1)
    })

    view.rerender(
      <SukooruProvider instance={instance}>
        <HookConsumer containerId="timeline" stateHandler={secondHandler} />
      </SukooruProvider>,
    )

    await waitFor(() => {
      expect(instance.setScrollStateHandler).toHaveBeenCalledTimes(2)
    })

    expect(instance.registerContainer).toHaveBeenCalledTimes(1)
  })

  it('복원 중 cleanup에서는 저장으로 기존 위치를 덮어쓰지 않는다', async () => {
    let resolveRestore: ((status: ScrollRestoreStatus) => void) | null = null
    const instance = createMockInstance()
    instance.restore.mockImplementation(
      () =>
        new Promise<ScrollRestoreStatus>((resolve) => {
          resolveRestore = resolve
        }),
    )

    render(
      <StrictMode>
        <SukooruProvider instance={instance}>
          <HookConsumer containerId="product-list" scrollKey="products" />
        </SukooruProvider>
      </StrictMode>,
    )

    expect(instance.save).not.toHaveBeenCalled()

    resolveRestore?.('restored')

    await waitFor(() => {
      expect(screen.getByTestId('container')).toHaveAttribute('data-status', 'restored')
    })

    expect(instance.save).not.toHaveBeenCalled()
  })

  it('virtual scroll 훅도 scrollKey를 save/restore에 그대로 전달한다', async () => {
    const instance = createMockInstance()
    const containerHandle = createHandle()
    instance.registerContainer.mockReturnValue(containerHandle)
    instance.restore.mockResolvedValue('restored' satisfies ScrollRestoreStatus)

    const view = render(
      <SukooruProvider instance={instance}>
        <VirtualHookConsumer scrollKey="/virtual" />
      </SukooruProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('virtual-container')).toHaveAttribute('data-status', 'restored')
    })

    expect(instance.restore).toHaveBeenCalledWith('/virtual')

    view.unmount()

    expect(instance.save).toHaveBeenCalledWith('/virtual')
    expect(containerHandle.unregister).toHaveBeenCalledTimes(1)
  })
})
