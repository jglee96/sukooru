import { createSukooru } from '@sukooru/core'
import type { App, InjectionKey, Plugin } from 'vue'
import type { SukooruInstance, SukooruOptions } from '@sukooru/core'

export interface CreateSukooruPluginOptions<T = unknown> extends SukooruOptions<T> {
  instance?: SukooruInstance<T>
}

export const SUKOORU_KEY: InjectionKey<SukooruInstance<any>> = Symbol('sukooru')

export const createSukooruPlugin = <T = unknown>(
  { instance, ...options }: CreateSukooruPluginOptions<T> = {},
): Plugin => {
  return {
    install(app: App) {
      const sukooru = instance ?? createSukooru<T>(options)
      const cleanup = sukooru.mount()
      const originalUnmount = app.unmount.bind(app)

      app.provide(SUKOORU_KEY, sukooru)
      app.unmount = (...args) => {
        cleanup()
        return originalUnmount(...args)
      }
    },
  }
}
