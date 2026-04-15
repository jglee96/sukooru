import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SukooruInstance } from '@sukooru/core'

const createSukooruMock = vi.hoisted(() => vi.fn())
const contextValues = vi.hoisted(() => new Map<symbol, unknown>())
const getContextMock = vi.hoisted(() =>
  vi.fn((key: symbol) => contextValues.get(key)),
)
const setContextMock = vi.hoisted(() =>
  vi.fn((key: symbol, value: unknown) => {
    contextValues.set(key, value)
  }),
)

vi.mock('@sukooru/core', async () => {
  const actual = await vi.importActual<typeof import('@sukooru/core')>('@sukooru/core')

  return {
    ...actual,
    createSukooru: createSukooruMock,
  }
})

vi.mock('svelte', () => ({
  getContext: getContextMock,
  setContext: setContextMock,
}))

import { createSukooruProvider } from '../provider'
import { getSukooruContext, setSukooruContext } from '../context'

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

describe('svelte context and provider', () => {
  afterEach(() => {
    contextValues.clear()
    createSukooruMock.mockReset()
    getContextMock.mockClear()
    setContextMock.mockClear()
  })

  it('provider가 instance가 없으면 createSukooru로 인스턴스를 만든다', () => {
    const cleanup = vi.fn()
    const instance = createMockInstance()
    instance.mount.mockReturnValue(cleanup)
    createSukooruMock.mockReturnValue(instance)

    const provider = createSukooruProvider({ waitForDomReady: false })

    expect(createSukooruMock).toHaveBeenCalledWith({ waitForDomReady: false })
    expect(instance.mount).toHaveBeenCalledTimes(1)

    provider.destroy()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('setSukooruContext와 getSukooruContext가 같은 인스턴스를 다룬다', () => {
    const instance = createMockInstance()

    expect(setSukooruContext(instance)).toBe(instance)
    expect(getSukooruContext()).toBe(instance)
  })

  it('getSukooruContext는 등록된 컨텍스트가 없으면 실패한다', () => {
    expect(() => getSukooruContext()).toThrow(
      'setSukooruContext로 등록된 Svelte 컴포넌트 트리 내부에서만 getSukooruContext를 사용할 수 있습니다.',
    )
  })
})
