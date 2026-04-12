import { SukooruProvider, useScrollRestore } from '@sukooru/react'

const products = Array.from({ length: 50 }, (_, index) => ({
  id: index + 1,
  name: `상품 ${index + 1}`,
}))

const ProductListPage = () => {
  const { ref, status } = useScrollRestore({
    containerId: 'product-list',
  })

  return (
    <main ref={ref} style={{ height: '100vh', overflowY: 'auto', padding: '24px' }}>
      <p>{status === 'restoring' ? '복원 중...' : '목록 준비 완료'}</p>
      <ul style={{ display: 'grid', gap: '12px', padding: 0 }}>
        {products.map((product) => (
          <li
            key={product.id}
            style={{
              listStyle: 'none',
              border: '1px solid #d9d9d9',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            {product.name}
          </li>
        ))}
      </ul>
    </main>
  )
}

export const App = () => {
  return (
    <SukooruProvider>
      <ProductListPage />
    </SukooruProvider>
  )
}

