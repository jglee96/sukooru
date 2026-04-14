import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { SukooruInstance } from '@sukooru/core'

const routeState = vi.hoisted(() => ({
  fullPath: '/products?page=2',
}))

const instance = vi.hoisted(
  (): SukooruInstance<unknown> => ({
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
  }),
)

const createSukooruMock = vi.hoisted(() => vi.fn(() => instance))
const vuePluginMarker = vi.hoisted(() => ({ install: vi.fn() }))
const createSukooruPluginMock = vi.hoisted(() => vi.fn(() => vuePluginMarker))
const useVueScrollRestoreMock = vi.hoisted(() => vi.fn(() => ({ marker: 'scroll' })))
const useVueVirtualScrollRestoreMock = vi.hoisted(
  () => vi.fn(() => ({ marker: 'virtual' })),
)

const nuxtAppState = vi.hoisted(() => ({
  app: {
    vueApp: {
      use: vi.fn(),
    },
    $router: {
      currentRoute: {
        value: routeState,
      },
    },
    $sukooru: instance,
    provide: vi.fn(),
  },
}))

vi.mock('#app', () => ({
  defineNuxtPlugin: <T>(plugin: (nuxtApp: unknown) => T) => plugin,
  useNuxtApp: () => nuxtAppState.app,
  useRoute: () => routeState,
}))

vi.mock('@sukooru/core', () => ({
  createSukooru: createSukooruMock,
}))

vi.mock('@sukooru/vue', () => ({
  createSukooruPlugin: createSukooruPluginMock,
  useScrollRestore: useVueScrollRestoreMock,
  useVirtualScrollRestore: useVueVirtualScrollRestoreMock,
}))

import {
  createSukooruNuxtPlugin,
  useScrollRestore,
  useSukooru,
  useVirtualScrollRestore,
} from '../index'

describe('@sukooru/nuxt', () => {
  it('plugin이 Nuxt app에 인스턴스를 주입하고 Vue plugin을 설치한다', () => {
    const plugin = createSukooruNuxtPlugin()
    plugin(nuxtAppState.app as never)

    expect(createSukooruMock).toHaveBeenCalledTimes(1)
    expect(createSukooruPluginMock).toHaveBeenCalledWith({ instance })
    expect(nuxtAppState.app.vueApp.use).toHaveBeenCalledWith(vuePluginMarker)
    expect(nuxtAppState.app.provide).toHaveBeenCalledWith('sukooru', instance)

    const getKey = createSukooruMock.mock.calls[0]?.[0]?.getKey as (() => string) | undefined
    expect(getKey?.()).toBe('/products?page=2')
  })

  it('useSukooru가 Nuxt app에서 주입된 인스턴스를 반환한다', () => {
    expect(useSukooru()).toBe(instance)
  })

  it('useScrollRestore가 현재 route를 기본 scrollKey로 전달한다', () => {
    useScrollRestore({
      containerId: 'product-list',
    })

    const options = useVueScrollRestoreMock.mock.calls.at(-1)?.[0]
    expect(options.containerId).toBe('product-list')
    expect(options.scrollKey.value).toBe('/products?page=2')
  })

  it('명시적 scrollKey가 있으면 route보다 우선한다', () => {
    useScrollRestore({
      containerId: 'product-list',
      scrollKey: ref('/manual'),
    })

    const options = useVueScrollRestoreMock.mock.calls.at(-1)?.[0]
    expect(options.scrollKey.value).toBe('/manual')
  })

  it('virtual composable도 현재 route를 기본 scrollKey로 전달한다', () => {
    useVirtualScrollRestore({
      containerId: 'virtual-list',
      virtualizer: {
        scrollOffset: 0,
        options: { count: 1 },
        getVirtualItems: () => [],
        scrollToOffset: () => {},
      },
    })

    const options = useVueVirtualScrollRestoreMock.mock.calls.at(-1)?.[0]
    expect(options.scrollKey.value).toBe('/products?page=2')
  })
})
