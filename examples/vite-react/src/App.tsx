import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MutableRefObject, ReactNode, UIEvent } from 'react'
import type { ScrollRestoreStatus, ScrollStateHandler } from '@sukooru/core'
import { SukooruProvider, useScrollRestore, useVirtualScrollRestore } from '@sukooru/react'
import {
  defaultDemoKind,
  demoByKind,
  demoDefinitions,
  findCatalogItem,
  infinitePages,
  type CatalogItem,
  type DemoDefinition,
  type DemoKind,
  virtualDemoItems,
  windowDemoItems,
} from './demoData'
import { useDemoVirtualizer } from './useDemoVirtualizer'

type DemoRoute =
  | { kind: DemoKind; page: 'list' }
  | { kind: DemoKind; itemId: number; page: 'detail' }

type DemoPageProps = {
  onNavigateDemo: (kind: DemoKind) => void
  onSelectItem: (kind: DemoKind, item: CatalogItem) => void
}

const infinitePageLoadDelay = 160
const virtualViewportHeight = 540
const virtualRowHeight = 132
const infiniteViewportHeight = 540

const statusLabels: Record<ScrollRestoreStatus, string> = {
  idle: '대기 중',
  missed: '저장된 위치 없음',
  restored: '복원 완료',
  restoring: '복원 중',
}

const wait = async (timeout: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, timeout)
  })
}

const replaceRoute = (path: string): void => {
  window.history.replaceState({ demoPath: path }, '', path)
}

const pushRoute = (path: string): void => {
  window.history.pushState({ demoPath: path }, '', path)
}

const blurActiveElement = (): void => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

const buildDetailPath = (kind: DemoKind, itemId: number): string => {
  return `${demoByKind[kind].basePath}/${itemId}`
}

const resolveRoute = (pathname: string): { canonicalPath: string; route: DemoRoute } => {
  if (pathname === '/') {
    return {
      canonicalPath: demoByKind[defaultDemoKind].basePath,
      route: { kind: defaultDemoKind, page: 'list' },
    }
  }

  for (const demo of demoDefinitions) {
    if (pathname === demo.basePath) {
      return {
        canonicalPath: demo.basePath,
        route: { kind: demo.kind, page: 'list' },
      }
    }

    const detailMatch = pathname.match(new RegExp(`^${demo.basePath}/(\\d+)$`))
    if (!detailMatch) {
      continue
    }

    const itemId = Number(detailMatch[1])
    if (!findCatalogItem(itemId)) {
      return {
        canonicalPath: demo.basePath,
        route: { kind: demo.kind, page: 'list' },
      }
    }

    return {
      canonicalPath: pathname,
      route: { kind: demo.kind, itemId, page: 'detail' },
    }
  }

  return {
    canonicalPath: demoByKind[defaultDemoKind].basePath,
    route: { kind: defaultDemoKind, page: 'list' },
  }
}

const StatusCard = ({ status }: { status?: ScrollRestoreStatus }) => {
  if (!status) {
    return (
      <section className="status-card">
        <span className="status-pill status-pill--detail">상세 화면</span>
        <strong>복원 동작은 목록 화면에서만 수행됩니다.</strong>
        <p>뒤로가기로 목록에 돌아오면 해당 데모가 등록한 컨테이너를 기준으로 위치를 다시 맞춥니다.</p>
      </section>
    )
  }

  return (
    <section className="status-card">
      <span className={`status-pill status-pill--${status}`}>{statusLabels[status]}</span>
      <strong>{status === 'restoring' ? '저장된 위치를 다시 맞추는 중입니다.' : '현재 복원 상태가 노출됩니다.'}</strong>
      <p>{status === 'missed' ? '첫 방문이거나 저장된 위치가 아직 없습니다.' : 'Sukooru가 저장/복원 시점을 직접 관리합니다.'}</p>
    </section>
  )
}

const DemoNavigation = ({
  activeKind,
  onNavigate,
}: {
  activeKind: DemoKind
  onNavigate: (kind: DemoKind) => void
}) => {
  return (
    <nav className="demo-nav" aria-label="복원 데모 선택">
      {demoDefinitions.map((demo) => {
        const isActive = demo.kind === activeKind

        return (
          <button
            key={demo.kind}
            type="button"
            className={`demo-nav__button${isActive ? ' demo-nav__button--active' : ''}`}
            onClick={() => onNavigate(demo.kind)}
          >
            <span className="demo-nav__eyebrow">{demo.eyebrow}</span>
            <strong>{demo.label}</strong>
          </button>
        )
      })}
    </nav>
  )
}

const DemoShell = ({
  children,
  demo,
  facts,
  heading = demo.title,
  onNavigateDemo,
  status,
  summary = demo.summary,
}: {
  children: ReactNode
  demo: DemoDefinition
  facts?: string[]
  heading?: string
  onNavigateDemo: (kind: DemoKind) => void
  status?: ScrollRestoreStatus
  summary?: string
}) => {
  const renderedFacts = facts ?? demo.facts

  return (
    <section className={`demo-shell demo-shell--${demo.kind}`}>
      <div className="demo-shell__content">
        <DemoNavigation activeKind={demo.kind} onNavigate={onNavigateDemo} />
        <header className="hero-panel">
          <div className="hero-panel__copy">
            <p className="demo-eyebrow">{demo.eyebrow}</p>
            <h1>{heading}</h1>
            <p>{summary}</p>
          </div>
          <div className="hero-panel__meta">
            <StatusCard status={status} />
            <section className="fact-card">
              <p className="fact-card__label">이 데모가 보여주는 것</p>
              <ul className="fact-list">
                {renderedFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </section>
          </div>
        </header>
        <div className="page-section">{children}</div>
      </div>
    </section>
  )
}

const CatalogGrid = ({
  demoKind,
  items,
  onSelect,
}: {
  demoKind: DemoKind
  items: CatalogItem[]
  onSelect: (item: CatalogItem) => void
}) => {
  return (
    <ul className="catalog-grid">
      {items.map((item) => (
        <li key={`${demoKind}-${item.id}`}>
          <button
            type="button"
            data-testid={demoKind === 'products' ? `product-card-${item.id}` : undefined}
            className="catalog-card"
            style={{ '--item-tint': item.tint } as CSSProperties}
            onClick={() => onSelect(item)}
          >
            <p className="catalog-card__tag">
              {item.category} #{item.id}
            </p>
            <h2 className="catalog-card__title">{item.name}</h2>
            <p className="catalog-card__summary">{item.summary}</p>
            <p className="catalog-card__price">{item.price}</p>
          </button>
        </li>
      ))}
    </ul>
  )
}

const WindowCatalogPage = ({ onNavigateDemo, onSelectItem }: DemoPageProps) => {
  const demo = demoByKind.products
  const { status } = useScrollRestore({
    containerId: 'window',
    scrollKey: demo.basePath,
  })

  return (
    <DemoShell demo={demo} onNavigateDemo={onNavigateDemo} status={status}>
      <section className="section-card">
        <div className="panel-head">
          <div>
            <p className="panel-head__eyebrow">Window Scroll</p>
            <h2>문서 전체가 스크롤 컨테이너인 가장 기본적인 복원 패턴</h2>
          </div>
          <div className="meta-row">
            <span className="meta-pill">scroll key: {demo.basePath}</span>
            <span className="meta-pill">48 cards</span>
          </div>
        </div>
        <CatalogGrid
          demoKind={demo.kind}
          items={windowDemoItems}
          onSelect={(item) => onSelectItem(demo.kind, item)}
        />
      </section>
    </DemoShell>
  )
}

const VirtualCatalogPage = ({ onNavigateDemo, onSelectItem }: DemoPageProps) => {
  const demo = demoByKind.virtual
  const virtualContainerRef = useRef<HTMLDivElement | null>(null)
  const { handleScroll, totalHeight, virtualItems, virtualizer } = useDemoVirtualizer({
    containerRef: virtualContainerRef,
    count: virtualDemoItems.length,
    itemHeight: virtualRowHeight,
    viewportHeight: virtualViewportHeight,
  })
  const {
    ref: restoreRef,
    status,
  } = useVirtualScrollRestore({
    containerId: 'virtual-list',
    scrollKey: demo.basePath,
    virtualizer,
  })

  const assignContainerRef = (element: HTMLDivElement | null) => {
    virtualContainerRef.current = element
    restoreRef.current = element
  }

  const firstVisibleItem = virtualDemoItems[virtualItems[0]?.index ?? 0] ?? virtualDemoItems[0]!

  return (
    <DemoShell demo={demo} onNavigateDemo={onNavigateDemo} status={status}>
      <section className="section-card">
        <div className="panel-head">
          <div>
            <p className="panel-head__eyebrow">Virtual Scroll</p>
            <h2>화면에 보이는 행만 렌더링하면서도 위치는 offset 기준으로 복원합니다</h2>
          </div>
          <div className="meta-row">
            <button
              type="button"
              data-testid="virtual-open-visible-item"
              className="panel-action"
              onClick={() => onSelectItem(demo.kind, firstVisibleItem)}
            >
              보이는 첫 카드 열기
            </button>
            <span className="meta-pill">rendered rows: {virtualItems.length}</span>
            <span className="meta-pill">first index: {virtualItems[0]?.index ?? 0}</span>
          </div>
        </div>

        <div
          ref={assignContainerRef}
          data-testid="virtual-list-container"
          className="scroll-panel"
          style={{ height: `${virtualViewportHeight}px` }}
          onScroll={handleScroll}
        >
          <div className="virtual-canvas" style={{ height: `${totalHeight}px` }}>
            {virtualItems.map((virtualItem) => {
              const item = virtualDemoItems[virtualItem.index]
              if (!item) {
                return null
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  className="virtual-row"
                  style={{
                    '--item-tint': item.tint,
                    height: `${virtualItem.size - 12}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  } as CSSProperties}
                  onClick={() => onSelectItem(demo.kind, item)}
                >
                  <div className="virtual-row__meta">
                    <span>{item.category}</span>
                    <span>index {virtualItem.index}</span>
                  </div>
                  <strong>{item.name}</strong>
                  <p>{item.summary}</p>
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </DemoShell>
  )
}

type InfiniteScrollState = {
  loadedPageCount: number
}

const InfiniteCatalogPage = ({ onNavigateDemo, onSelectItem }: DemoPageProps) => {
  const demo = demoByKind.infinite
  const initialPageCount = 2
  const [loadedPageCount, setLoadedPageCount] = useState(initialPageCount)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const loadedPageCountRef = useRef(initialPageCount)
  const pendingLoadRef = useRef<Promise<void> | null>(null)
  const loadNextPageRef = useRef<() => Promise<void>>(async () => {})

  loadedPageCountRef.current = loadedPageCount

  loadNextPageRef.current = async () => {
    if (loadedPageCountRef.current >= infinitePages.length) {
      return
    }

    if (pendingLoadRef.current) {
      await pendingLoadRef.current
      return
    }

    setIsLoadingPage(true)

    const pendingLoad = wait(infinitePageLoadDelay)
      .then(() => {
        const nextPageCount = Math.min(loadedPageCountRef.current + 1, infinitePages.length)
        loadedPageCountRef.current = nextPageCount
        startTransition(() => {
          setLoadedPageCount(nextPageCount)
        })
      })
      .finally(() => {
        pendingLoadRef.current = null
        setIsLoadingPage(false)
      })

    pendingLoadRef.current = pendingLoad
    await pendingLoad
  }

  const stateHandler = useMemo<ScrollStateHandler<InfiniteScrollState>>(
    () => ({
      captureState: () => ({
        loadedPageCount: loadedPageCountRef.current,
      }),
      applyState: async ({ loadedPageCount: nextPageCount }) => {
        while (loadedPageCountRef.current < nextPageCount) {
          await loadNextPageRef.current()
        }
      },
    }),
    [],
  )

  const { ref, status } = useScrollRestore<InfiniteScrollState>({
    containerId: 'infinite-list',
    scrollKey: demo.basePath,
    stateHandler,
  })

  const visibleItems = useMemo(() => {
    return infinitePages.slice(0, loadedPageCount).flat()
  }, [loadedPageCount])

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const { clientHeight, scrollHeight, scrollTop } = event.currentTarget
    const remainingDistance = scrollHeight - clientHeight - scrollTop

    if (remainingDistance <= 140) {
      void loadNextPageRef.current()
    }
  }

  return (
    <DemoShell demo={demo} onNavigateDemo={onNavigateDemo} status={status}>
      <section className="section-card">
        <div className="panel-head">
          <div>
            <p className="panel-head__eyebrow">Infinite Scroll</p>
            <h2>추가된 페이지 수를 먼저 복원한 뒤 스크롤 좌표를 맞추는 패턴</h2>
          </div>
          <div className="meta-row">
            <span className="meta-pill">loaded pages: {loadedPageCount}</span>
            <span className="meta-pill">visible cards: {visibleItems.length}</span>
          </div>
        </div>

        <div
          ref={ref as MutableRefObject<HTMLDivElement | null>}
          data-testid="infinite-list-container"
          className="scroll-panel"
          style={{ height: `${infiniteViewportHeight}px` }}
          onScroll={handleScroll}
        >
          <ul className="infinite-list">
            {visibleItems.map((item) => (
              <li key={`infinite-${item.id}`}>
                <button
                  type="button"
                  className="infinite-card"
                  style={{ '--item-tint': item.tint } as CSSProperties}
                  onClick={() => onSelectItem(demo.kind, item)}
                >
                  <div className="infinite-card__meta">
                    <span>{item.category}</span>
                    <span>상품 #{item.id}</span>
                  </div>
                  <strong>{item.name}</strong>
                  <p>{item.summary}</p>
                  <span className="infinite-card__price">{item.price}</span>
                </button>
              </li>
            ))}
          </ul>
          {isLoadingPage ? <p className="loading-pill">다음 페이지를 불러오는 중입니다…</p> : null}
        </div>
      </section>
    </DemoShell>
  )
}

const DetailPage = ({
  demo,
  item,
  onBack,
  onNavigateDemo,
}: {
  demo: DemoDefinition
  item: CatalogItem
  onBack: () => void
  onNavigateDemo: (kind: DemoKind) => void
}) => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  return (
    <DemoShell
      demo={demo}
      onNavigateDemo={onNavigateDemo}
      heading={`${item.name} 상세`}
      status={undefined}
      summary={demo.detailNote}
      facts={[
        `return path: ${demo.basePath}`,
        `selected item: #${item.id}`,
        'detail page itself does not register a scroll container',
      ]}
    >
      <section className="section-card detail-card">
        <button
          type="button"
          data-testid="back-button"
          className="back-button"
          onClick={onBack}
        >
          목록으로 돌아가기
        </button>

        <div className="detail-card__header" style={{ '--item-tint': item.tint } as CSSProperties}>
          <p className="catalog-card__tag">
            {item.category} #{item.id}
          </p>
          <h2>{item.name}</h2>
          <p>{item.summary}</p>
        </div>

        <div className="detail-grid">
          <article className="detail-tile">
            <p className="detail-tile__label">현재 가격</p>
            <strong>{item.price}</strong>
            <p>카드 밀도를 높여서 스크롤 차이를 바로 체감할 수 있게 만든 예제 데이터입니다.</p>
          </article>
          <article className="detail-tile">
            <p className="detail-tile__label">복원 포인트</p>
            <strong>{demo.label}</strong>
            <p>이 화면을 떠나면 리스트가 다시 mount 되며, Sukooru는 demo별 컨테이너에 맞춰 복원을 다시 시도합니다.</p>
          </article>
          <article className="detail-tile">
            <p className="detail-tile__label">추천 확인 순서</p>
            <strong>스크롤 → 상세 진입 → 뒤로가기</strong>
            <p>virtual/infinite 데모는 같은 단계에서 offset과 로드된 페이지 수까지 함께 유지되는지 확인하면 됩니다.</p>
          </article>
        </div>
      </section>
    </DemoShell>
  )
}

const ExampleRouter = () => {
  const [route, setRoute] = useState<DemoRoute>(() => resolveRoute(window.location.pathname).route)

  useEffect(() => {
    const previousMode = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    const syncRouteFromLocation = () => {
      const { canonicalPath, route: nextRoute } = resolveRoute(window.location.pathname)

      if (window.location.pathname !== canonicalPath || window.history.state?.demoPath !== canonicalPath) {
        replaceRoute(canonicalPath)
      }

      setRoute(nextRoute)
    }

    syncRouteFromLocation()
    window.addEventListener('popstate', syncRouteFromLocation)

    return () => {
      window.removeEventListener('popstate', syncRouteFromLocation)
      window.history.scrollRestoration = previousMode
    }
  }, [])

  const navigateToDemo = (kind: DemoKind) => {
    const nextPath = demoByKind[kind].basePath

    if (window.location.pathname === nextPath && route.page === 'list') {
      return
    }

    blurActiveElement()
    pushRoute(nextPath)
    setRoute({ kind, page: 'list' })
  }

  const handleSelectItem = (kind: DemoKind, item: CatalogItem) => {
    blurActiveElement()
    pushRoute(buildDetailPath(kind, item.id))
    setRoute({ kind, itemId: item.id, page: 'detail' })
  }

  const handleBack = () => {
    const basePath = demoByKind[route.kind].basePath
    const canUseBrowserBack =
      window.location.pathname !== basePath &&
      window.history.length > 1 &&
      Boolean(window.history.state?.demoPath)

    if (canUseBrowserBack) {
      window.history.back()
      return
    }

    replaceRoute(basePath)
    setRoute({ kind: route.kind, page: 'list' })
  }

  if (route.page === 'detail') {
    const selectedItem = findCatalogItem(route.itemId)

    if (!selectedItem) {
      return <WindowCatalogPage onNavigateDemo={navigateToDemo} onSelectItem={handleSelectItem} />
    }

    return (
      <DetailPage
        demo={demoByKind[route.kind]}
        item={selectedItem}
        onBack={handleBack}
        onNavigateDemo={navigateToDemo}
      />
    )
  }

  switch (route.kind) {
    case 'virtual':
      return <VirtualCatalogPage onNavigateDemo={navigateToDemo} onSelectItem={handleSelectItem} />
    case 'infinite':
      return <InfiniteCatalogPage onNavigateDemo={navigateToDemo} onSelectItem={handleSelectItem} />
    case 'products':
    default:
      return <WindowCatalogPage onNavigateDemo={navigateToDemo} onSelectItem={handleSelectItem} />
  }
}

export const App = () => {
  return (
    <SukooruProvider
      options={{
        getKey: () => window.location.pathname,
        restoreDelay: 16,
      }}
    >
      <div data-testid="react-example-app">
        <ExampleRouter />
      </div>
    </SukooruProvider>
  )
}
