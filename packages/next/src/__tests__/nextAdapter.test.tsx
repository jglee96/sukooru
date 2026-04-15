import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ContainerHandle,
  ScrollRestoreStatus,
  SukooruInstance,
} from '@sukooru/core'

const navigationState = vi.hoisted(() => ({
  pathname: '/products',
  search: 'page=2',
}))

const routerState = vi.hoisted(() => ({
  asPath: '/catalog?page=3',
}))

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
  useSearchParams: () => ({
    toString: () => navigationState.search,
  }),
}))

vi.mock('next/router', () => ({
  useRouter: () => ({
    asPath: routerState.asPath,
  }),
}))

import { useSukooru } from '@sukooru/react'
import { SukooruProvider } from '../SukooruProvider'
import { useScrollRestore } from '../useScrollRestore'
import { useVirtualScrollRestore } from '../useVirtualScrollRestore'
import { withSukooruRestore } from '../withSukooruRestore'

const createHandle = (): ContainerHandle => ({
  unregister: vi.fn(),
})

const createMockInstance = (): SukooruInstance<unknown> & {
  mount: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  registerContainer: ReturnType<typeof vi.fn>
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
  }
}

const HookConsumer = () => {
  const { ref, status } = useScrollRestore({
    containerId: 'product-list',
  })

  return <div ref={ref as React.Ref<HTMLDivElement>} data-status={status} data-testid="container" />
}

const VirtualHookConsumer = () => {
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
    virtualizer,
  })

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      data-status={status}
      data-testid="virtual-container"
    />
  )
}

const CurrentKeyConsumer = () => {
  const sukooru = useSukooru()
  return <div data-testid="current-key">{sukooru.currentKey}</div>
}

describe('@sukooru/next', () => {
  afterEach(() => {
    navigationState.pathname = '/products'
    navigationState.search = 'page=2'
    routerState.asPath = '/catalog?page=3'
    document.body.innerHTML = ''
  })

  it('App Router provider가 currentKey를 현재 route 기준으로 노출한다', () => {
    const view = render(
      <SukooruProvider>
        <CurrentKeyConsumer />
      </SukooruProvider>,
    )

    expect(screen.getByTestId('current-key').textContent).toBe('/products?page=2')

    navigationState.pathname = '/products/42'
    navigationState.search = 'ref=modal'

    view.rerender(
      <SukooruProvider>
        <CurrentKeyConsumer />
      </SukooruProvider>,
    )

    expect(screen.getByTestId('current-key').textContent).toBe('/products/42?ref=modal')
  })

  it('App Router provider가 mount 정리 함수를 연결한다', () => {
    const cleanup = vi.fn()
    const instance = createMockInstance()
    instance.mount.mockReturnValue(cleanup)

    const view = render(
      <SukooruProvider instance={instance}>
        <CurrentKeyConsumer />
      </SukooruProvider>,
    )

    expect(instance.mount).toHaveBeenCalledTimes(1)

    view.unmount()

    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('App Router 훅이 route key를 scrollKey 기본값으로 사용한다', async () => {
    const instance = createMockInstance()
    const containerHandle = createHandle()
    instance.registerContainer.mockReturnValue(containerHandle)
    instance.restore.mockResolvedValue('restored' satisfies ScrollRestoreStatus)

    const view = render(
      <SukooruProvider instance={instance}>
        <HookConsumer />
      </SukooruProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('container').getAttribute('data-status')).toBe('restored')
    })

    expect(instance.restore).toHaveBeenCalledWith('/products?page=2')

    navigationState.pathname = '/products/42'
    navigationState.search = 'ref=modal'

    view.rerender(
      <SukooruProvider instance={instance}>
        <HookConsumer />
      </SukooruProvider>,
    )

    await waitFor(() => {
      expect(instance.restore).toHaveBeenLastCalledWith('/products/42?ref=modal')
    })

    expect(instance.save).toHaveBeenCalledWith('/products?page=2')
    expect(instance.registerContainer).toHaveBeenCalledTimes(2)
  })

  it('Pages Router HOC도 route key를 scrollKey 기본값으로 사용한다', async () => {
    const instance = createMockInstance()
    instance.restore.mockResolvedValue('restored' satisfies ScrollRestoreStatus)
    const WrappedConsumer = withSukooruRestore(HookConsumer, { instance })
    const view = render(<WrappedConsumer />)

    await waitFor(() => {
      expect(screen.getByTestId('container').getAttribute('data-status')).toBe('restored')
    })

    expect(instance.restore).toHaveBeenCalledWith('/catalog?page=3')

    routerState.asPath = '/catalog/42'
    view.rerender(<WrappedConsumer />)

    await waitFor(() => {
      expect(instance.restore).toHaveBeenLastCalledWith('/catalog/42')
    })

    expect(instance.save).toHaveBeenCalledWith('/catalog?page=3')
  })

  it('Pages Router HOC도 mount 정리 함수를 연결한다', () => {
    const cleanup = vi.fn()
    const instance = createMockInstance()
    instance.mount.mockReturnValue(cleanup)
    const WrappedConsumer = withSukooruRestore(CurrentKeyConsumer, { instance })

    const view = render(<WrappedConsumer />)

    expect(instance.mount).toHaveBeenCalledTimes(1)

    view.unmount()

    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('virtual scroll 훅도 route key를 기본 scrollKey로 전달한다', async () => {
    const instance = createMockInstance()
    instance.restore.mockResolvedValue('restored' satisfies ScrollRestoreStatus)

    render(
      <SukooruProvider instance={instance}>
        <VirtualHookConsumer />
      </SukooruProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('virtual-container').getAttribute('data-status')).toBe(
        'restored',
      )
    })

    expect(instance.restore).toHaveBeenCalledWith('/products?page=2')
  })
})
