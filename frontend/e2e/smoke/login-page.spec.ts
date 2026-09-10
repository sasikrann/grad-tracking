import { expect, test } from '@playwright/test'

import { mockGoogleIdentity } from '../support/google-identity.mock'

test('shows the application login page', async ({ page }) => {
  await mockGoogleIdentity(page)
  await page.goto('/login')

  await expect(page).toHaveTitle('ADT GRAD Tracking')
  await expect(page.getByRole('heading', { name: 'ACADEMIC TRACKING' })).toBeVisible()
  await expect(page.getByText('Development Login')).toBeVisible()
})
