import type { ScrollStateHandler } from './types'

type RegisteredHandler<T> = {
  handler: ScrollStateHandler<T>
  token: symbol
}

export class ScrollStateRegistry<T> {
  private readonly handlers = new Map<string, RegisteredHandler<T>>()

  register(containerId: string, handler: ScrollStateHandler<T>): symbol {
    const token = Symbol(containerId)
    this.handlers.set(containerId, { handler, token })
    return token
  }

  unregister(containerId: string, token?: symbol): void {
    const registered = this.handlers.get(containerId)
    if (!registered) {
      return
    }

    if (token && registered.token !== token) {
      return
    }

    this.handlers.delete(containerId)
  }

  getAll(): Array<[string, ScrollStateHandler<T>]> {
    return Array.from(this.handlers.entries()).map(([containerId, { handler }]) => [
      containerId,
      handler,
    ])
  }
}

