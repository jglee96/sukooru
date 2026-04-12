export type DemoKind = 'products' | 'virtual' | 'infinite'

export interface DemoDefinition {
  kind: DemoKind
  basePath: string
  label: string
  eyebrow: string
  title: string
  summary: string
  detailNote: string
  facts: string[]
}

export interface CatalogItem {
  id: number
  name: string
  price: string
  summary: string
  category: string
  tint: string
}

const productNames = [
  'Atlas Notebook',
  'Borrowed Light Lamp',
  'Coastline Tray',
  'Dune Speaker',
  'Ember Cup',
  'Folded Canvas Bag',
  'Grove Shelf',
  'Harbor Blanket',
]

const productCategories = [
  'Archive',
  'Studio',
  'Transit',
  'Edition',
  'Field Note',
  'Workshop',
]

const productTints = ['#d19b4b', '#5b8794', '#9b5d55', '#7d8c47', '#8c6c57', '#6d5d86']

const chunk = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

const pick = <T,>(items: T[], index: number): T => {
  return items[index % items.length]!
}

export const demoDefinitions: DemoDefinition[] = [
  {
    kind: 'products',
    basePath: '/products',
    label: 'Window Scroll',
    eyebrow: 'Sukooru Window Demo',
    title: '문서형 페이지 전체 스크롤을 그대로 되돌립니다.',
    summary:
      '가장 기본적인 사용 예제입니다. 페이지 전체가 스크롤 대상일 때도 URL을 기준으로 위치를 저장하고, 목록을 떠났다가 돌아오면 같은 지점에서 이어서 읽을 수 있습니다.',
    detailNote:
      '이 상세 화면은 window 스크롤을 사용하던 목록이 완전히 unmount 되는 상황을 만듭니다. 뒤로가기를 눌렀을 때 저장된 window 위치가 다시 적용되어야 합니다.',
    facts: ['restore target: window', 'scroll key: /products', 'save timing: unmount + popstate'],
  },
  {
    kind: 'virtual',
    basePath: '/virtual',
    label: 'Virtual Scroll',
    eyebrow: 'Sukooru Virtual Demo',
    title: '가상화된 리스트에서도 offset과 visible range를 함께 복원합니다.',
    summary:
      '실제 DOM에는 일부 행만 렌더링되지만, `useVirtualScrollRestore`는 virtualizer offset을 함께 저장합니다. 데이터 양이 커도 사용자는 마지막으로 보던 카드 근처에서 다시 시작할 수 있습니다.',
    detailNote:
      '이 화면은 virtual list가 사라졌다가 다시 생기는 흐름을 검증합니다. 돌아가면 virtualizer offset과 첫 visible index가 함께 복원되어야 합니다.',
    facts: ['restore target: #virtual-list', 'hook: useVirtualScrollRestore', 'state: scrollOffset + firstVisibleIndex'],
  },
  {
    kind: 'infinite',
    basePath: '/infinite',
    label: 'Infinite Scroll',
    eyebrow: 'Sukooru Infinite Demo',
    title: '추가 페이지를 다시 불러온 뒤에 스크롤 좌표를 맞춥니다.',
    summary:
      'infinite scroll은 위치만 저장하면 복원이 틀어집니다. 이 데모는 불러온 페이지 수를 먼저 복원한 뒤, 그 다음에 스크롤 좌표를 적용하는 패턴을 보여줍니다.',
    detailNote:
      '상세 화면에서 돌아오면 이전에 열어 둔 페이지 수를 먼저 복원하고, 그 다음에 스크롤 위치를 맞춥니다. 데이터보다 좌표가 먼저 복원되면 생기는 어긋남을 방지하는 예제입니다.',
    facts: ['restore target: #infinite-list', 'hook: useScrollRestore', 'state: loadedPageCount'],
  },
]

export const demoByKind = Object.fromEntries(
  demoDefinitions.map((demo) => [demo.kind, demo]),
) as Record<DemoKind, DemoDefinition>

export const defaultDemoKind: DemoKind = 'products'

export const catalogItems: CatalogItem[] = Array.from({ length: 72 }, (_, index) => {
  const productNumber = index + 1
  const tint = pick(productTints, index)
  const productName = pick(productNames, index)
  const category = pick(productCategories, index)

  return {
    id: productNumber,
    name: `${productName} ${productNumber}`,
    price: `${(index + 3) * 7_500}원`,
    category,
    tint,
    summary: `${category} 컬렉션의 ${productNumber}번째 데모 아이템입니다. 스크롤 복원 상태를 눈으로 확인하기 좋게 카드 밀도를 높였습니다.`,
  }
})

export const windowDemoItems = catalogItems.slice(0, 48)
export const virtualDemoItems = catalogItems
export const infinitePages = chunk(catalogItems.slice(6, 66), 12)

export const findCatalogItem = (itemId: number): CatalogItem | null => {
  return catalogItems.find((item) => item.id === itemId) ?? null
}
