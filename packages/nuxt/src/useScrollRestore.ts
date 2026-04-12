import { computed, toValue } from 'vue'
import { useRoute } from '#app'
import { useScrollRestore as useVueScrollRestore } from '@sukooru/vue'
import type {
  UseScrollRestoreOptions,
  UseScrollRestoreResult,
} from '@sukooru/vue'

export const useScrollRestore = <T = unknown>(
  options: UseScrollRestoreOptions<T> = {},
): UseScrollRestoreResult => {
  const route = useRoute()
  const scrollKey = computed(() => toValue(options.scrollKey) ?? route.fullPath)

  return useVueScrollRestore({
    ...options,
    scrollKey,
  })
}
