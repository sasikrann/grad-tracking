import { expect, test } from '@playwright/test'

import { mockGoogleIdentity } from '../support/google-identity.mock'

const testAdminEmail = process.env.E2E_ADMIN_EMAIL ?? 'automation-test@lamduan.mfu.ac.th'

test('signs the bootstrap administrator in through development login', async ({ page }) => {
  await mockGoogleIdentity(page)
  await page.goto('/login')

  await page.getByLabel('Registered user email').fill(testAdminEmail)
  await page.getByRole('button', { name: 'Continue for development' }).click()

  await expect(page).toHaveURL(/\/admin\/student-dashboard$/)
})
