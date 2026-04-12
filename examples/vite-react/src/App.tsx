import { useState } from 'react'
import { SukooruProvider, useScrollRestore } from '@sukooru/react'

type Product = {
  id: number
  name: string
  price: string
  summary: string
}

const products: Product[] = Array.from({ length: 48 }, (_, index) => ({
  id: index + 1,
  name: `상품 ${index + 1}`,
  price: `${(index + 2) * 7000}원`,
  summary: `스크롤 복원 동작을 확인하기 위한 데모 상품 ${index + 1}입니다.`,
}))

const shellStyle = {
  minHeight: '100vh',
  background:
    'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(244,237,224,0.92) 100%)',
}

const headerStyle = {
  position: 'sticky' as const,
  top: 0,
  zIndex: 2,
  backdropFilter: 'blur(12px)',
  background: 'rgba(246, 243, 234, 0.82)',
  borderBottom: '1px solid rgba(26, 26, 26, 0.08)',
}

const ProductListPage = ({
  onSelect,
}: {
  onSelect: (product: Product) => void
}) => {
  const { ref, status } = useScrollRestore({
    containerId: 'product-list',
    scrollKey: '/products',
  })

  return (
    <section style={shellStyle}>
      <header style={{ ...headerStyle, padding: '24px 28px' }}>
        <p style={{ margin: 0, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Sukooru React 예제
        </p>
        <h1 style={{ margin: '10px 0 8px', fontSize: '32px' }}>목록을 떠났다가 다시 돌아오세요</h1>
        <p style={{ margin: 0, maxWidth: '640px', color: '#5c5347', lineHeight: 1.6 }}>
          스크롤을 충분히 내린 뒤 상품을 눌러 상세 화면으로 이동하고, 다시 목록으로 돌아오면 이전 위치가 복원됩니다.
        </p>
        <p style={{ margin: '16px 0 0', fontSize: '14px', color: '#7a6c5d' }}>
          현재 상태: {status === 'restoring' ? '복원 중' : status}
        </p>
      </header>

      <main
        ref={ref}
        style={{
          height: 'calc(100vh - 180px)',
          overflowY: 'auto',
          padding: '24px 28px 40px',
        }}
      >
        <ul
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            margin: 0,
            padding: 0,
          }}
        >
          {products.map((product) => (
            <li key={product.id} style={{ listStyle: 'none' }}>
              <button
                onClick={() => onSelect(product)}
                style={{
                  width: '100%',
                  padding: '20px',
                  border: '1px solid rgba(26, 26, 26, 0.08)',
                  borderRadius: '18px',
                  background: '#fffdf8',
                  textAlign: 'left',
                  boxShadow: '0 16px 30px rgba(83, 62, 39, 0.06)',
                  cursor: 'pointer',
                }}
              >
                <p style={{ margin: 0, fontSize: '13px', color: '#9a6b34' }}>상품 #{product.id}</p>
                <h2 style={{ margin: '12px 0 8px', fontSize: '20px' }}>{product.name}</h2>
                <p style={{ margin: 0, color: '#5c5347', lineHeight: 1.6 }}>{product.summary}</p>
                <p style={{ margin: '18px 0 0', fontWeight: 700 }}>{product.price}</p>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </section>
  )
}

const ProductDetailPage = ({
  product,
  onBack,
}: {
  product: Product
  onBack: () => void
}) => {
  return (
    <section style={shellStyle}>
      <div style={{ maxWidth: '840px', margin: '0 auto', padding: '56px 28px' }}>
        <button
          onClick={onBack}
          style={{
            border: 'none',
            background: '#1a1a1a',
            color: '#fff',
            borderRadius: '999px',
            padding: '12px 18px',
            cursor: 'pointer',
          }}
        >
          목록으로 돌아가기
        </button>
        <p style={{ margin: '28px 0 10px', color: '#9a6b34', fontSize: '14px' }}>상품 #{product.id}</p>
        <h1 style={{ margin: 0, fontSize: '42px' }}>{product.name}</h1>
        <p style={{ margin: '16px 0 0', fontSize: '20px', lineHeight: 1.7, color: '#4d4438' }}>
          이 화면은 목록이 unmount 되는 상황을 만들기 위한 예제입니다. 다시 돌아가면 이전 스크롤 위치가 유지되어야 합니다.
        </p>
        <div
          style={{
            marginTop: '28px',
            borderRadius: '24px',
            padding: '24px',
            background: '#fffdf8',
            border: '1px solid rgba(26, 26, 26, 0.08)',
          }}
        >
          <p style={{ margin: 0, color: '#7a6c5d', lineHeight: 1.8 }}>
            현재 상품 가격은 {product.price}이며, 상세 화면에서는 Sukooru가 관여하지 않습니다. 핵심은 목록 컴포넌트가 다시 mount될 때 직전 위치가 복원되는지입니다.
          </p>
        </div>
      </div>
    </section>
  )
}

export const App = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  return (
    <SukooruProvider>
      {selectedProduct ? (
        <ProductDetailPage
          product={selectedProduct}
          onBack={() => setSelectedProduct(null)}
        />
      ) : (
        <ProductListPage onSelect={setSelectedProduct} />
      )}
    </SukooruProvider>
  )
}

