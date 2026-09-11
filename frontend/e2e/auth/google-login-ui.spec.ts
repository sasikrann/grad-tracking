import { expect, test } from '@playwright/test'

import { mockGoogleIdentity } from '../support/google-identity.mock'

test('initializes the Google Identity button with the configured client', async ({ page }) => {
  await mockGoogleIdentity(page)
  await page.goto('/login')

  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, '__googleClientId')))
    .toBe('e2e-client-id.apps.googleusercontent.com')
})
