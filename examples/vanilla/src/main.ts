import { createSukooru } from '@sukooru/core'

const sukooru = createSukooru({
  restoreDelay: 16,
})

const container = document.querySelector<HTMLElement>('#product-list')

if (container) {
  const containerHandle = sukooru.registerContainer(container, 'product-list')
  const stopListening = sukooru.mount()

  void sukooru.restore()

  window.addEventListener('beforeunload', () => {
    void sukooru.save()
    containerHandle.unregister()
    stopListening()
  })
}

