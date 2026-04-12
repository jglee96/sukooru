import { expect, test } from '@playwright/test'

test('restores the product list scroll position after back navigation', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByTestId('react-example-app')).toBeVisible()

  await page.evaluate(() => {
    window.scrollTo({ top: 1_600, left: 0, behavior: 'auto' })
  })

  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(1_000)

  await page.getByTestId('product-card-29').click()
  await expect(page).toHaveURL(/\/products\/29$/)

  const expectedRestoredScrollY = await page.evaluate(() => {
    const rawEntry = sessionStorage.getItem('sukooru:1:%2Fproducts')
    if (!rawEntry) {
      return null
    }

    const entry = JSON.parse(rawEntry) as {
      positions?: Array<{ containerId: string; y: number }>
    }

    return entry.positions?.find((position) => position.containerId === 'window')?.y ?? null
  })

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
