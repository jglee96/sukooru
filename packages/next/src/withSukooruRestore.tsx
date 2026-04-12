import { useEffect, useLayoutEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { createSukooru } from '@sukooru/core'
import { SukooruContext } from '@sukooru/react'
import type { ComponentType } from 'react'
import type { SukooruInstance, SukooruOptions } from '@sukooru/core'
import { RouteKeyContext } from './routeKey'

export interface WithSukooruRestoreOptions<T = unknown> {
  options?: SukooruOptions<T>
  instance?: SukooruInstance<T>
}

const useSafeLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export const withSukooruRestore = <P extends object, T = unknown>(
  WrappedComponent: ComponentType<P>,
  { options, instance }: WithSukooruRestoreOptions<T> = {},
) => {
  const WithSukooruRestore = (props: P) => {
    const router = useRouter()
    const routeKey = router.asPath
    const routeKeyRef = useRef(routeKey)
    const instanceRef = useRef<SukooruInstance<T> | null>(instance ?? null)

    routeKeyRef.current = routeKey

    if (instanceRef.current === null) {
      instanceRef.current = createSukooru<T>({
        ...options,
        getKey: () => routeKeyRef.current,
      })
    }

    useSafeLayoutEffect(() => {
      const cleanup = instanceRef.current?.mount()
      return cleanup
    }, [])

    return (
      <SukooruContext.Provider value={instanceRef.current}>
        <RouteKeyContext.Provider value={routeKey}>
          <WrappedComponent {...props} />
        </RouteKeyContext.Provider>
      </SukooruContext.Provider>
    )
  }

  const displayName = WrappedComponent.displayName ?? WrappedComponent.name ?? 'Component'

  WithSukooruRestore.displayName = `withSukooruRestore(${displayName})`

  return WithSukooruRestore
}
