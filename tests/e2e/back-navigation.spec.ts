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
