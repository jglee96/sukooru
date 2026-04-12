import { getContext, setContext } from 'svelte'
import type { SukooruInstance } from 'sukooru-core'

export const SUKOORU_CONTEXT = Symbol('sukooru')

export const setSukooruContext = <T = unknown>(
  instance: SukooruInstance<T>,
): SukooruInstance<T> => {
  setContext(SUKOORU_CONTEXT, instance)
  return instance
}

export const getSukooruContext = <T = unknown>(): SukooruInstance<T> => {
  const instance = getContext<SukooruInstance<T> | undefined>(SUKOORU_CONTEXT)

  if (!instance) {
    throw new Error('setSukooruContext로 등록된 Svelte 컴포넌트 트리 내부에서만 getSukooruContext를 사용할 수 있습니다.')
  }

  return instance
}
