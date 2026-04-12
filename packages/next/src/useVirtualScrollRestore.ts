import { useVirtualScrollRestore as useReactVirtualScrollRestore } from '@sukooru/react'
import type { UseVirtualScrollRestoreOptions } from '@sukooru/react'
import { useRouteKey } from './routeKey'

export const useVirtualScrollRestore = (
  options: UseVirtualScrollRestoreOptions,
) => {
  const routeKey = useRouteKey()

  return useReactVirtualScrollRestore({
    ...options,
    scrollKey: options.scrollKey ?? routeKey,
  })
}
