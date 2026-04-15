type HistorySubscriber = {
  syncCurrentKey: () => void
  onPopState: () => void | Promise<void>
}

const historyPatchManagerKey = '__sukooruHistoryPatchManager__'

type ManagedWindow = Window & {
  [historyPatchManagerKey]?: BrowserHistoryPatchManager
}

class BrowserHistoryPatchManager {
  private readonly subscribers = new Map<symbol, HistorySubscriber>()
  private installed = false
  private originalPushState: History['pushState'] | null = null
  private originalReplaceState: History['replaceState'] | null = null
  private patchedPushState: History['pushState'] | null = null
  private patchedReplaceState: History['replaceState'] | null = null

  constructor(private readonly targetWindow: Window) {}

  subscribe(subscriber: HistorySubscriber): () => void {
    const token = Symbol('sukooru-history-subscriber')
    this.subscribers.set(token, subscriber)
    this.install()

    return () => {
      this.subscribers.delete(token)

      if (this.subscribers.size === 0) {
        this.uninstall()
      }
    }
  }

  private install(): void {
    if (this.installed) {
      return
    }

    this.originalPushState = this.targetWindow.history.pushState
    this.originalReplaceState = this.targetWindow.history.replaceState

    this.patchedPushState = ((...args: Parameters<History['pushState']>) => {
      this.originalPushState?.apply(this.targetWindow.history, args)
      this.notifyNavigationChange()
    }) as History['pushState']

    this.patchedReplaceState = ((...args: Parameters<History['replaceState']>) => {
      this.originalReplaceState?.apply(this.targetWindow.history, args)
      this.notifyNavigationChange()
    }) as History['replaceState']

    this.targetWindow.history.pushState = this.patchedPushState
    this.targetWindow.history.replaceState = this.patchedReplaceState
    this.targetWindow.addEventListener('popstate', this.handlePopState)
    this.installed = true
  }

  private uninstall(): void {
    if (!this.installed) {
      return
    }

    this.targetWindow.removeEventListener('popstate', this.handlePopState)

    if (
      this.patchedPushState &&
      this.originalPushState &&
      this.targetWindow.history.pushState === this.patchedPushState
    ) {
      this.targetWindow.history.pushState = this.originalPushState
    }

    if (
      this.patchedReplaceState &&
      this.originalReplaceState &&
      this.targetWindow.history.replaceState === this.patchedReplaceState
    ) {
      this.targetWindow.history.replaceState = this.originalReplaceState
    }

    this.originalPushState = null
    this.originalReplaceState = null
    this.patchedPushState = null
    this.patchedReplaceState = null
    this.installed = false
  }

  private notifyNavigationChange(): void {
    Array.from(this.subscribers.values()).forEach((subscriber) => {
      subscriber.syncCurrentKey()
    })
  }

  private readonly handlePopState = (): void => {
    Array.from(this.subscribers.values()).forEach((subscriber) => {
      void subscriber.onPopState()
    })
  }
}

const getHistoryPatchManager = (targetWindow: Window): BrowserHistoryPatchManager => {
  const managedWindow = targetWindow as ManagedWindow

  managedWindow[historyPatchManagerKey] ??= new BrowserHistoryPatchManager(targetWindow)

  return managedWindow[historyPatchManagerKey]
}

export const subscribeToBrowserHistory = (
  subscriber: HistorySubscriber,
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {}
  }

  return getHistoryPatchManager(window).subscribe(subscriber)
}
