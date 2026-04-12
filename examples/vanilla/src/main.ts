import { createSukooru } from '@sukooru/core'
import type { ContainerHandle } from '@sukooru/core'
import './style.css'

type Product = {
  id: number
  name: string
  price: string
}

const products: Product[] = Array.from({ length: 40 }, (_, index) => ({
  id: index + 1,
  name: `상품 ${index + 1}`,
  price: `${(index + 3) * 5000}원`,
}))

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('앱 루트를 찾을 수 없습니다.')
}

const sukooru = createSukooru({
  getKey: () => window.location.pathname,
  restoreDelay: 16,
  waitForDomReady: true,
})

const productListKey = '/products'
let listHandle: ContainerHandle | null = null

const replaceRoute = (path: string): void => {
  window.history.replaceState({ demoPath: path }, '', path)
}

const pushRoute = (path: string): void => {
  window.history.pushState({ demoPath: path }, '', path)
}

const findProduct = (productId: number): Product | null => {
  return products.find((product) => product.id === productId) ?? null
}

const unregisterList = (): void => {
  listHandle?.unregister()
  listHandle = null
}

const renderDetail = (product: Product): void => {
  unregisterList()

  app.innerHTML = `
    <section style="min-height:100vh;padding:56px 28px;background:linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(244,237,224,0.92) 100%);">
      <div style="max-width:820px;margin:0 auto;">
        <button id="back-button" style="border:none;background:#1a1a1a;color:#fff;border-radius:999px;padding:12px 18px;cursor:pointer;">
          목록으로 돌아가기
        </button>
        <p style="margin:28px 0 10px;color:#9a6b34;font-size:14px;">상품 #${product.id}</p>
        <h1 style="margin:0;font-size:42px;">${product.name}</h1>
        <p style="margin:18px 0 0;font-size:20px;line-height:1.7;color:#4d4438;">
          이 화면은 목록이 DOM에서 사라졌다가 다시 나타나는 상황을 만들기 위한 예제입니다.
        </p>
        <div style="margin-top:28px;padding:24px;border-radius:24px;background:#fffdf8;border:1px solid rgba(26, 26, 26, 0.08);">
          <p style="margin:0;line-height:1.8;color:#6f6355;">
            상품 가격은 ${product.price}입니다. 다시 목록으로 돌아가면 저장된 스크롤 위치를 Sukooru가 복원합니다.
          </p>
        </div>
      </div>
    </section>
  `

  app.querySelector<HTMLButtonElement>('#back-button')?.addEventListener('click', () => {
    if (window.location.pathname !== productListKey && window.history.length > 1) {
      window.history.back()
      return
    }

    replaceRoute(productListKey)
    void renderList()
  })
}

const renderList = async (): Promise<void> => {
  app.innerHTML = `
    <section style="min-height:100vh;background:linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(244,237,224,0.92) 100%);">
      <header style="position:sticky;top:0;z-index:2;padding:24px 28px;background:rgba(247, 241, 232, 0.84);backdrop-filter:blur(12px);border-bottom:1px solid rgba(26, 26, 26, 0.08);">
        <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Sukooru Vanilla 예제</p>
        <h1 style="margin:10px 0 8px;font-size:32px;">상품을 보고 다시 목록으로 돌아오세요</h1>
        <p style="margin:0;max-width:640px;color:#5c5347;line-height:1.6;">
          목록 스크롤 위치를 저장한 뒤 상세 화면으로 이동하고, 다시 목록으로 돌아오면 저장된 위치가 복원됩니다.
        </p>
      </header>
      <main id="product-list" style="height:calc(100vh - 174px);overflow-y:auto;padding:24px 28px 40px;">
        <ul style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin:0;padding:0;">
          ${products
            .map(
              (product) => `
                <li style="list-style:none;">
                  <button
                    data-product-id="${product.id}"
                    style="width:100%;padding:20px;border:1px solid rgba(26, 26, 26, 0.08);border-radius:18px;background:#fffdf8;text-align:left;box-shadow:0 16px 30px rgba(83, 62, 39, 0.06);cursor:pointer;"
                  >
                    <p style="margin:0;font-size:13px;color:#9a6b34;">상품 #${product.id}</p>
                    <h2 style="margin:12px 0 8px;font-size:20px;">${product.name}</h2>
                    <p style="margin:0;color:#5c5347;line-height:1.6;">바닐라 환경에서 수동 저장과 복원을 확인하는 예제입니다.</p>
                    <p style="margin:18px 0 0;font-weight:700;">${product.price}</p>
                  </button>
                </li>
              `,
            )
            .join('')}
        </ul>
      </main>
    </section>
  `

  const container = app.querySelector<HTMLElement>('#product-list')
  if (!container) {
    return
  }

  unregisterList()
  listHandle = sukooru.registerContainer(container, 'product-list')

  app.querySelectorAll<HTMLButtonElement>('[data-product-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const productId = Number(button.dataset.productId)
      const product = products.find((item) => item.id === productId)

      if (!product) {
        return
      }

      await sukooru.save(productListKey)
      pushRoute(`/products/${product.id}`)
      renderDetail(product)
    })
  })

  await sukooru.restore(productListKey)
}

const renderCurrentRoute = async (): Promise<void> => {
  const pathname = window.location.pathname

  if (pathname === '/' || pathname === productListKey) {
    if (pathname === '/') {
      replaceRoute(productListKey)
    }

    await renderList()
    return
  }

  const detailMatch = pathname.match(/^\/products\/(\d+)$/)
  if (!detailMatch) {
    replaceRoute(productListKey)
    await renderList()
    return
  }

  const product = findProduct(Number(detailMatch[1]))
  if (!product) {
    replaceRoute(productListKey)
    await renderList()
    return
  }

  renderDetail(product)
}

window.addEventListener('beforeunload', () => {
  if (listHandle) {
    void sukooru.save(productListKey)
  }
})

window.addEventListener('popstate', () => {
  void renderCurrentRoute()
})

window.history.scrollRestoration = 'manual'

void renderCurrentRoute()
