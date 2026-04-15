import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SukooruInstance } from '@sukooru/core'

const createSukooruMock = vi.hoisted(() => vi.fn())

vi.mock('@sukooru/core', async () => {
  const actual = await vi.importActual<typeof import('@sukooru/core')>('@sukooru/core')

  return {
    ...actual,
    createSukooru: createSukooruMock,
  }
})

import { SukooruProvider } from '../SukooruProvider'
import { useSukooru } from '../useSukooru'

const createMockInstance = (): SukooruInstance<unknown> & {
  mount: ReturnType<typeof vi.fn>
} => {
  const instance: SukooruInstance<unknown> = {
    save: async () => {},
    restore: async () => 'idle',
    clear: () => {},
    clearAll: () => {},
    getKeys: async () => [],
    registerContainer: () => ({ unregister: () => {} }),
    setScrollStateHandler: () => ({ unregister: () => {} }),
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
  }
}

describe('react provider and hook', () => {
  afterEach(() => {
    createSukooruMock.mockReset()
  })

  it('provider가 instance가 없으면 createSukooru로 인스턴스를 만든다', () => {
    const cleanup = vi.fn()
    const instance = createMockInstance()
    instance.mount.mockReturnValue(cleanup)
    createSukooruMock.mockReturnValue(instance)

    render(
      <SukooruProvider options={{ waitForDomReady: false }}>
        <HookConsumer />
      </SukooruProvider>,
    )

    expect(createSukooruMock).toHaveBeenCalledWith({ waitForDomReady: false })
    expect(instance.mount).toHaveBeenCalledTimes(1)
    expect(screen.getByText('current')).toBeInTheDocument()
  })

  it('useSukooru는 provider 밖에서 호출되면 실패한다', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<HookConsumer />)).toThrow(
      'SukooruProvider 내부에서만 useSukooru를 사용할 수 있습니다.',
    )

    consoleError.mockRestore()
  })
})

const HookConsumer = () => {
  const sukooru = useSukooru()
  return <span>{sukooru.currentKey}</span>
}
