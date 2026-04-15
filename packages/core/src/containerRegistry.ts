type RegisteredContainer = {
  element: Element | Window
  token: symbol
}

export class ContainerRegistry {
  private readonly containers = new Map<string, RegisteredContainer>()
  private revision = 0

  register(element: Element | Window, id: string): symbol {
    if (this.containers.has(id)) {
      throw new Error(
        `Sukooru container "${id}" is already registered. Container ids must be globally unique until unregistered.`,
      )
    }

    const token = Symbol(id)
    this.containers.set(id, { element, token })
    this.revision += 1
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
    this.revision += 1
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

  getRevision(): number {
    return this.revision
  }
}
