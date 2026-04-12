import { writable } from 'svelte/store'
import type { Action } from 'svelte/action'
import type { Readable } from 'svelte/store'
import type {
  ContainerHandle,
  ScrollRestoreStatus,
  ScrollStateHandler,
  SukooruInstance,
} from '@sukooru/core'

export interface ScrollRestoreActionOptions<T = unknown> {
  containerId: string
  scrollKey?: string
  stateHandler?: ScrollStateHandler<T>
}

export interface ScrollRestoreController<T = unknown> {
  action: Action<HTMLElement, ScrollRestoreActionOptions<T>>
  status: Readable<ScrollRestoreStatus>
}

const requireOptions = <T>(
  options: ScrollRestoreActionOptions<T> | undefined,
): ScrollRestoreActionOptions<T> => {
  if (!options) {
    throw new Error('scroll restore action에는 containerId가 포함된 옵션이 필요합니다.')
  }

  return options
}

export const createScrollRestore = <T = unknown>(
  sukooru: SukooruInstance<T>,
): ScrollRestoreController<T> => {
  const statusStore = writable<ScrollRestoreStatus>('idle')
  let currentOptions: ScrollRestoreActionOptions<T> | null = null
  let containerHandle: ContainerHandle | null = null
  let handlerHandle: ContainerHandle | null = null
  let restoreRunId = 0
  let isRestoring = false

  const syncStateHandler = (options: ScrollRestoreActionOptions<T>) => {
    handlerHandle?.unregister()
    handlerHandle = options.stateHandler
      ? sukooru.setScrollStateHandler(options.containerId, options.stateHandler)
      : null
  }

  const detach = (options: ScrollRestoreActionOptions<T>) => {
    restoreRunId += 1

    if (!isRestoring) {
      void sukooru.save(options.scrollKey)
    }

    isRestoring = false
    containerHandle?.unregister()
    containerHandle = null
    handlerHandle?.unregister()
    handlerHandle = null
  }

  const attach = (node: HTMLElement, options: ScrollRestoreActionOptions<T>) => {
    currentOptions = options
    syncStateHandler(options)
    containerHandle = sukooru.registerContainer(node, options.containerId)

    const currentRestoreRunId = ++restoreRunId
    isRestoring = true
    statusStore.set('restoring')

    void sukooru
      .restore(options.scrollKey)
      .then((status) => {
        if (currentRestoreRunId === restoreRunId) {
          statusStore.set(status)
        }
      })
      .catch(() => {
        if (currentRestoreRunId === restoreRunId) {
          statusStore.set('idle')
        }
      })
      .finally(() => {
        if (currentRestoreRunId === restoreRunId) {
          isRestoring = false
        }
      })
  }

  const replace = (
    node: HTMLElement,
    nextOptions: ScrollRestoreActionOptions<T>,
  ) => {
    const previousOptions = currentOptions

    if (!previousOptions) {
      attach(node, nextOptions)
      return
    }

    currentOptions = nextOptions

    const shouldReattach =
      previousOptions.containerId !== nextOptions.containerId ||
      previousOptions.scrollKey !== nextOptions.scrollKey

    if (shouldReattach) {
      detach(previousOptions)
      attach(node, nextOptions)
      return
    }

    if (previousOptions.stateHandler !== nextOptions.stateHandler) {
      syncStateHandler(nextOptions)
    }
  }

  const action: Action<HTMLElement, ScrollRestoreActionOptions<T>> = (node, options) => {
    attach(node, requireOptions(options))

    return {
      update(nextOptions) {
        replace(node, requireOptions(nextOptions))
      },
      destroy() {
        if (currentOptions) {
          detach(currentOptions)
          currentOptions = null
        }
      },
    }
  }

  return {
    action,
    status: {
      subscribe: statusStore.subscribe,
    },
  }
}

export const createScrollRestoreAction = <T = unknown>(
  sukooru: SukooruInstance<T>,
): Action<HTMLElement, ScrollRestoreActionOptions<T>> => {
  return createScrollRestore(sukooru).action
}
