'use client'

import { useScrollRestore } from '@sukooru/next'

const products = Array.from({ length: 24 }, (_, index) => ({
  id: index + 1,
  name: `Fixture product ${index + 1}`,
}))

export default function ProductsPage() {
  const { ref, status } = useScrollRestore({
    containerId: 'product-list',
  })

  return (
    <main
      ref={ref}
      style={{ height: '100vh', overflowY: 'auto', padding: 24 }}
    >
      <p>Status: {status}</p>
      <ul style={{ display: 'grid', gap: 12, padding: 0 }}>
        {products.map((product) => (
          <li
            key={product.id}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 12,
              listStyle: 'none',
              minHeight: 96,
              padding: 16,
            }}
          >
            {product.name}
          </li>
        ))}
      </ul>
    </main>
  )
}
