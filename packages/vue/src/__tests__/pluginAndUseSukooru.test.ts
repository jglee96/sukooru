import { createApp, defineComponent, h } from 'vue'
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

import { createSukooruPlugin } from '../plugin'
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

describe('vue plugin and hook', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    createSukooruMock.mockReset()
  })

  it('plugin이 instance가 없으면 createSukooru로 인스턴스를 만든다', () => {
    const cleanup = vi.fn()
    const instance = createMockInstance()
    instance.mount.mockReturnValue(cleanup)
    createSukooruMock.mockReturnValue(instance)
    const root = document.createElement('div')
    const app = createApp({
      render: () => h('div'),
    })

    app.use(createSukooruPlugin({ waitForDomReady: false }))
    app.mount(root)

    expect(createSukooruMock).toHaveBeenCalledWith({ waitForDomReady: false })
    expect(instance.mount).toHaveBeenCalledTimes(1)

    app.unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('useSukooru는 plugin으로 주입된 인스턴스를 반환한다', () => {
    const instance = createMockInstance()
    const root = document.createElement('div')
    const app = createApp(
      defineComponent(() => () => h('span', useSukooru().currentKey)),
    )

    app.use(createSukooruPlugin({ instance }))
    app.mount(root)

    expect(root.textContent).toBe('current')
  })

  it('useSukooru는 plugin 밖에서 호출되면 실패한다', () => {
    const root = document.createElement('div')
    const app = createApp(
      defineComponent(() => () => h('span', useSukooru().currentKey)),
    )
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => app.mount(root)).toThrow(
      'createSukooruPlugin으로 등록된 Vue 앱 내부에서만 useSukooru를 사용할 수 있습니다.',
    )

    consoleWarn.mockRestore()
    consoleError.mockRestore()
  })
})
