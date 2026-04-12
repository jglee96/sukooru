import { useScrollRestore as useReactScrollRestore } from '@sukooru/react'
import type {
  UseScrollRestoreOptions,
  UseScrollRestoreResult,
} from '@sukooru/react'
import { useRouteKey } from './routeKey'

export const useScrollRestore = <T = unknown>(
  options: UseScrollRestoreOptions<T> = {},
): UseScrollRestoreResult => {
  const routeKey = useRouteKey()

  return useReactScrollRestore({
    ...options,
    scrollKey: options.scrollKey ?? routeKey,
  })
}
