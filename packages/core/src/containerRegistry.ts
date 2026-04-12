type RegisteredContainer = {
  element: Element | Window
  token: symbol
}

export class ContainerRegistry {
  private readonly containers = new Map<string, RegisteredContainer>()

  register(element: Element | Window, id: string): symbol {
    const token = Symbol(id)
    this.containers.set(id, { element, token })
    return token
  }

  unregister(id: string, token?: symbol): void {
    const registered = this.containers.get(id)
    if (!registered) {
      return
    }

    if (token && registered.token !== token) {
      return
    }

    this.containers.delete(id)
  }

  find(id: string): Element | Window | undefined {
    return this.containers.get(id)?.element
  }

  getAll(): Array<{ id: string; element: Element | Window }> {
    return Array.from(this.containers.entries()).map(([id, { element }]) => ({
      id,
      element,
    }))
  }
}

