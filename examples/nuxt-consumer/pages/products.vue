<script setup lang="ts">
import { useScrollRestore } from '@sukooru/nuxt'

const products = Array.from({ length: 24 }, (_, index) => ({
  id: index + 1,
  name: `Nuxt product ${index + 1}`,
}))

const { containerRef, status } = useScrollRestore({
  containerId: 'product-list',
})
</script>

<template>
  <main
    ref="containerRef"
    style="height: 100vh; overflow-y: auto; padding: 24px"
  >
    <p>Status: {{ status }}</p>
    <ul style="display: grid; gap: 12px; padding: 0">
      <li
        v-for="product in products"
        :key="product.id"
        style="border: 1px solid #d1d5db; border-radius: 12px; list-style: none; min-height: 96px; padding: 16px"
      >
        {{ product.name }}
      </li>
    </ul>
  </main>
</template>
