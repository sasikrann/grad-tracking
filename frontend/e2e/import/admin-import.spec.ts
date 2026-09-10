import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { mockGoogleIdentity } from '../support/google-identity.mock'

const testAdminEmail = process.env.E2E_ADMIN_EMAIL ?? 'automation-test@lamduan.mfu.ac.th'
const advisorFile = fileURLToPath(new URL('../fixtures/imports/advisors-valid.csv', import.meta.url))
const studentFile = fileURLToPath(new URL('../fixtures/imports/students-valid.csv', import.meta.url))

async function signInAsTestAdmin(page: import('@playwright/test').Page) {
  await mockGoogleIdentity(page)
  await page.goto('/login')
  await page.getByLabel('Registered user email').fill(testAdminEmail)
  await page.getByRole('button', { name: 'Continue for development' }).click()
  await expect(page).toHaveURL(/\/admin\/student-dashboard$/)
}

async function selectEnglish(page: import('@playwright/test').Page) {
  const englishButton = page.getByRole('button', { name: 'EN', exact: true })
  await englishButton.click()
  await expect(englishButton).toHaveAttribute('aria-pressed', 'true')
}

test('admin imports an advisor and a student, then opens the assigned milestones', async ({
  page,
}) => {
  await signInAsTestAdmin(page)

  await page.goto('/admin/advisor-dashboard')
  await selectEnglish(page)
  await expect(page.getByRole('heading', { name: 'Advisor Management' })).toBeVisible()
  await page.getByRole('button', { name: /Import Excel/ }).click()

  const advisorDialog = page.getByRole('dialog')
  await advisorDialog.locator('input[type="file"]').setInputFiles(advisorFile)
  await advisorDialog.getByRole('button', { name: 'Import Advisor' }).click()
  await expect(page.getByRole('table').getByText('E2E Advisor One')).toBeVisible()

  await page.goto('/admin/student-dashboard')
  await selectEnglish(page)
  await expect(page.getByRole('heading', { name: 'Student Management' })).toBeVisible()
  await page.getByRole('button', { name: /Import Excel/ }).click()

  const studentDialog = page.getByRole('dialog')
  await studentDialog.locator('input[type="file"]').setInputFiles(studentFile)
  await studentDialog.getByRole('button', { name: 'Import Student' }).click()
  const studentTable = page.getByRole('table')
  await expect(studentTable.getByText('E2E Student One')).toBeVisible()

  await studentTable.getByRole('button', { name: 'View E2E Student One' }).click()
  await expect(page).toHaveURL(/\/admin\/students\/6551303008\/milestones$/)
  await expect(page.getByText(/milestone/i).first()).toBeVisible()
})
