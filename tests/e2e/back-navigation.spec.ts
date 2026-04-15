import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const readSavedScrollPosition = async (
  page: Page,
  storageKey: string,
  containerId: string,
) => {
  return page.evaluate(
    ({ containerId: nextContainerId, storageKey: nextStorageKey }) => {
      const rawEntry = sessionStorage.getItem(nextStorageKey)
      if (!rawEntry) {
        return null
      }

      const entry = JSON.parse(rawEntry) as {
        positions?: Array<{ containerId: string; y: number }>
      }

      return entry.positions?.find((position) => position.containerId === nextContainerId)?.y ?? null
    },
    { containerId, storageKey },
  )
}

const scrollElementToBottom = async (page: Page, testId: string) => {
  await page.getByTestId(testId).evaluate((element) => {
    element.scrollTop = element.scrollHeight
    element.dispatchEvent(new Event('scroll', { bubbles: true }))
  })
}

const findFullyVisibleInfiniteCardTestId = async (page: Page): Promise<string> => {
  const testId = await page.locator('[data-testid^="infinite-card-"]').evaluateAll((elements) => {
    const container = document.querySelector('[data-testid="infinite-list-container"]')
    if (!(container instanceof HTMLElement)) {
      return null
    }

    const containerRect = container.getBoundingClientRect()

    const visibleCard = elements.find((element) => {
      if (!(element instanceof HTMLElement)) {
        return false
      }

      const rect = element.getBoundingClientRect()
      return rect.top >= containerRect.top && rect.bottom <= containerRect.bottom
    })

    if (!(visibleCard instanceof HTMLElement)) {
      return null
    }

    return visibleCard.dataset.testid ?? null
  })

  if (!testId) {
    throw new Error('Could not find a fully visible infinite card before navigating away.')
  }

  return testId
}

test('restores the product list scroll position after back navigation', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByTestId('react-example-app')).toBeVisible()

  await page.evaluate(() => {
    window.scrollTo({ top: 1_600, left: 0, behavior: 'auto' })
  })

  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(1_000)

  await page.getByTestId('product-card-29').click()
  await expect(page).toHaveURL(/\/products\/29$/)

  const expectedRestoredScrollY = await readSavedScrollPosition(
    page,
    'sukooru:1:%2Fproducts',
    'window',
  )

  expect(expectedRestoredScrollY).not.toBeNull()
  expect(expectedRestoredScrollY ?? 0).toBeGreaterThan(200)

  await page.goBack()
  await expect(page).toHaveURL(/\/products$/)

  await expect
    .poll(
      async () =>
        page.evaluate(
          (scrollY) => Math.abs(Math.round(window.scrollY) - scrollY) <= 20,
          expectedRestoredScrollY,
        ),
    )
    .toBe(true)
})

test('restores virtual list offset after back navigation', async ({ page }) => {
  await page.goto('/virtual')

  const virtualList = page.getByTestId('virtual-list-container')
  await virtualList.evaluate((element) => {
    element.scrollTop = 1_900
    element.dispatchEvent(new Event('scroll', { bubbles: true }))
  })

  await expect.poll(() => virtualList.evaluate((element) => Math.round(element.scrollTop))).toBeGreaterThan(1_500)

  await page.getByTestId('virtual-open-visible-item').click()
  await expect(page).toHaveURL(/\/virtual\/\d+$/)

  const expectedRestoredScrollY = await readSavedScrollPosition(
    page,
    'sukooru:1:%2Fvirtual',
    'virtual-list',
  )

  expect(expectedRestoredScrollY).not.toBeNull()
  expect(expectedRestoredScrollY ?? 0).toBeGreaterThan(800)

  await page.goBack()
  await expect(page).toHaveURL(/\/virtual$/)

  await expect
    .poll(async () =>
      virtualList.evaluate(
        (element, scrollY) => Math.abs(Math.round(element.scrollTop) - scrollY) <= 20,
        expectedRestoredScrollY,
      ),
    )
    .toBe(true)
})

test('restores infinite list state and offset after back navigation', async ({ page }) => {
  await page.goto('/infinite')

  const infiniteList = page.getByTestId('infinite-list-container')
  const infiniteCards = page.locator('[data-testid^="infinite-card-"]')

  await expect(infiniteCards).toHaveCount(24)

  await scrollElementToBottom(page, 'infinite-list-container')

  await expect.poll(() => infiniteCards.count()).toBe(36)
  await expect.poll(() => infiniteList.evaluate((element) => Math.round(element.scrollTop))).toBeGreaterThan(600)

  const visibleCardTestId = await findFullyVisibleInfiniteCardTestId(page)
  const visibleCardId = visibleCardTestId.replace('infinite-card-', '')

  await page.getByTestId(visibleCardTestId).click()
  await expect(page).toHaveURL(new RegExp(`/infinite/${visibleCardId}$`))

  const expectedRestoredScrollY = await readSavedScrollPosition(
    page,
    'sukooru:1:%2Finfinite',
    'infinite-list',
  )

  expect(expectedRestoredScrollY).not.toBeNull()
  expect(expectedRestoredScrollY ?? 0).toBeGreaterThan(600)

  await page.goBack()
  await expect(page).toHaveURL(/\/infinite$/)
  await expect.poll(() => infiniteCards.count()).toBe(36)

  await expect
    .poll(async () =>
      infiniteList.evaluate(
        (element, scrollY) => Math.abs(Math.round(element.scrollTop) - scrollY) <= 20,
        expectedRestoredScrollY,
      ),
    )
    .toBe(true)
})

test('restores the products window scroll after switching demos with pushState navigation', async ({ page }) => {
  await page.goto('/products')

  await page.evaluate(() => {
    window.scrollTo({ top: 1_450, left: 0, behavior: 'auto' })
  })

  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(1_000)

  await page.getByTestId('demo-nav-virtual').click()
  await expect(page).toHaveURL(/\/virtual$/)

  const expectedRestoredScrollY = await readSavedScrollPosition(
    page,
    'sukooru:1:%2Fproducts',
    'window',
  )

  expect(expectedRestoredScrollY).not.toBeNull()
  expect(expectedRestoredScrollY ?? 0).toBeGreaterThan(200)

  await page.getByTestId('demo-nav-products').click()
  await expect(page).toHaveURL(/\/products$/)

  await expect
    .poll(
      async () =>
        page.evaluate(
          (scrollY) => Math.abs(Math.round(window.scrollY) - scrollY) <= 20,
          expectedRestoredScrollY,
        ),
    )
    .toBe(true)
})
