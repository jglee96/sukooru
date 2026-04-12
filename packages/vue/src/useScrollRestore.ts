import {
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  toValue,
  watch,
} from 'vue'
import type {
  ContainerHandle,
  ScrollRestoreStatus,
  ScrollStateHandler,
} from '@sukooru/core'
import type { MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import { useSukooru } from './useSukooru'

export interface UseScrollRestoreOptions<T = unknown> {
  containerId?: MaybeRefOrGetter<string | undefined>
  scrollKey?: MaybeRefOrGetter<string | undefined>
  stateHandler?: MaybeRefOrGetter<ScrollStateHandler<T> | undefined>
}

export interface UseScrollRestoreResult {
  containerRef: Ref<HTMLElement | null>
  status: ShallowRef<ScrollRestoreStatus>
}

export const useScrollRestore = <T = unknown>(
  {
    containerId = 'window',
    scrollKey,
    stateHandler,
  }: UseScrollRestoreOptions<T> = {},
): UseScrollRestoreResult => {
  const sukooru = useSukooru<T>()
  const containerRef = ref<HTMLElement | null>(null)
  const status = shallowRef<ScrollRestoreStatus>('idle')

  const resolveContainerId = () => toValue(containerId) ?? 'window'
  const resolveScrollKey = () => toValue(scrollKey)
  const resolveStateHandler = () => toValue(stateHandler)

  let currentContainerId = resolveContainerId()
  let containerHandle: ContainerHandle | null = null
  let handlerHandle: ContainerHandle | null = null
  let restoreRunId = 0
  let isMounted = false
  let isRestoring = false

  const syncStateHandler = (nextContainerId: string) => {
    handlerHandle?.unregister()

    const nextStateHandler = resolveStateHandler()
    handlerHandle = nextStateHandler
      ? sukooru.setScrollStateHandler(nextContainerId, nextStateHandler)
      : null
  }

  const attach = (nextContainerId: string, nextScrollKey?: string) => {
    const element = nextContainerId === 'window' ? window : containerRef.value
    if (!element) {
      return
    }

    currentContainerId = nextContainerId
    syncStateHandler(nextContainerId)
    containerHandle = sukooru.registerContainer(element, nextContainerId)

    const currentRestoreRunId = ++restoreRunId
    isRestoring = true
    status.value = 'restoring'

    void sukooru
      .restore(nextScrollKey)
      .then((nextStatus) => {
        if (currentRestoreRunId === restoreRunId) {
          status.value = nextStatus
        }
      })
      .catch(() => {
        if (currentRestoreRunId === restoreRunId) {
          status.value = 'idle'
        }
      })
      .finally(() => {
        if (currentRestoreRunId === restoreRunId) {
          isRestoring = false
        }
      })
  }

  const detach = (nextScrollKey?: string) => {
    if (!isRestoring) {
      void sukooru.save(nextScrollKey)
    }

    containerHandle?.unregister()
    containerHandle = null
    handlerHandle?.unregister()
    handlerHandle = null
  }

  onMounted(() => {
    isMounted = true
    attach(resolveContainerId(), resolveScrollKey())
  })

  watch(
    [resolveContainerId, resolveScrollKey],
    ([nextContainerId, nextScrollKey], [, previousScrollKey]) => {
      if (!isMounted) {
        return
      }

      detach(previousScrollKey)
      attach(nextContainerId, nextScrollKey)
    },
  )

  watch(
    resolveStateHandler,
    () => {
      if (!isMounted) {
        return
      }

      syncStateHandler(currentContainerId)
    },
  )

  onBeforeUnmount(() => {
    detach(resolveScrollKey())
    isMounted = false
  })

  return {
    containerRef,
    status,
  }
}
