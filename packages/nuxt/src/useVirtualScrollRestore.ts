import { computed, toValue } from 'vue'
import { useRoute } from '#app'
import { useVirtualScrollRestore as useVueVirtualScrollRestore } from 'sukooru-vue'
import type { UseVirtualScrollRestoreOptions } from 'sukooru-vue'

export const useVirtualScrollRestore = (
  options: UseVirtualScrollRestoreOptions,
) => {
  const route = useRoute()
  const scrollKey = computed(() => toValue(options.scrollKey) ?? route.fullPath)

  return useVueVirtualScrollRestore({
    ...options,
    scrollKey,
  })
}
