import { createSukooru } from '@sukooru/core'
import type { SukooruInstance, SukooruOptions } from '@sukooru/core'

export interface CreateSukooruProviderOptions<T = unknown> extends SukooruOptions<T> {
  instance?: SukooruInstance<T>
}

export interface SukooruProvider<T = unknown> {
  instance: SukooruInstance<T>
  destroy: () => void
}

export const createSukooruProvider = <T = unknown>(
  { instance, ...options }: CreateSukooruProviderOptions<T> = {},
): SukooruProvider<T> => {
  const sukooru = instance ?? createSukooru<T>(options)
  const destroy = sukooru.mount()

  return {
    instance: sukooru,
    destroy,
  }
}
