import type { Action } from 'svelte/action'
import type { SukooruInstance } from '@sukooru/core'
import {
  createScrollRestore,
  type ScrollRestoreActionOptions,
  type ScrollRestoreController,
} from './scrollRestore'

export interface VirtualItemLike {
  index: number
}

export interface VirtualizerLike {
  scrollOffset: number
  options: {
    count: number
  }
  getVirtualItems: () => VirtualItemLike[]
  scrollToOffset: (offset: number, options?: { align?: string }) => void
}

export interface VirtualScrollState {
  scrollOffset: number
  firstVisibleIndex: number
  itemCount: number
}

export interface VirtualScrollRestoreActionOptions {
  containerId: string
  scrollKey?: string
  virtualizer: VirtualizerLike
  invalidateOnCountChange?: boolean
}

export interface VirtualScrollRestoreController {
  action: Action<HTMLElement, VirtualScrollRestoreActionOptions>
  status: ScrollRestoreController<VirtualScrollState>['status']
}

const toScrollRestoreOptions = (
  options: VirtualScrollRestoreActionOptions,
) => ({
  containerId: options.containerId,
  scrollKey: options.scrollKey,
  stateHandler: {
    captureState: () => ({
      scrollOffset: options.virtualizer.scrollOffset,
      firstVisibleIndex: options.virtualizer.getVirtualItems()[0]?.index ?? 0,
      itemCount: options.virtualizer.options.count,
    }),
    applyState: (state: VirtualScrollState) => {
      const countChanged =
        (options.invalidateOnCountChange ?? true) &&
        options.virtualizer.options.count !== state.itemCount

      if (countChanged) {
        return
      }

      options.virtualizer.scrollToOffset(state.scrollOffset, { align: 'start' })
    },
  },
})

export const createVirtualScrollRestore = (
  sukooru: SukooruInstance<VirtualScrollState>,
): VirtualScrollRestoreController => {
  const controller = createScrollRestore<VirtualScrollState>(sukooru)
  const action: Action<HTMLElement, VirtualScrollRestoreActionOptions> = (
    node,
    options,
  ) => {
    if (!options) {
      throw new Error('virtual scroll restore action에는 virtualizer가 포함된 옵션이 필요합니다.')
    }

    const delegate = (controller.action(node, toScrollRestoreOptions(options)) ?? {}) as {
      update?: (options: ScrollRestoreActionOptions<VirtualScrollState>) => void
      destroy?: () => void
    }

    return {
      update(nextOptions) {
        if (!nextOptions) {
          throw new Error('virtual scroll restore action에는 virtualizer가 포함된 옵션이 필요합니다.')
        }

        delegate.update?.(toScrollRestoreOptions(nextOptions))
      },
      destroy() {
        delegate.destroy?.()
      },
    }
  }

  return {
    action,
    status: controller.status,
  }
}

export const createVirtualScrollRestoreAction = (
  sukooru: SukooruInstance<VirtualScrollState>,
): Action<HTMLElement, VirtualScrollRestoreActionOptions> => {
  return createVirtualScrollRestore(sukooru).action
}
