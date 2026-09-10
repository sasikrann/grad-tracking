import { expect, test, type Page } from '@playwright/test'

import { mockGoogleIdentity } from '../support/google-identity.mock'

const testAdminEmail = process.env.E2E_ADMIN_EMAIL ?? 'automation-test@lamduan.mfu.ac.th'
const testStudentEmail =
  process.env.E2E_STUDENT_EMAIL ?? 'automation-student@lamduan.mfu.ac.th'

async function signIn(page: Page, email: string, expectedUrl: RegExp) {
  await mockGoogleIdentity(page)
  await page.goto('/login')
  await page.getByLabel('Registered user email').fill(email)
  await page.getByRole('button', { name: 'Continue for development' }).click()
  await expect(page).toHaveURL(expectedUrl)
}

async function useEnglish(page: Page) {
  const englishButton = page.getByRole('button', { name: 'EN', exact: true })
  if ((await englishButton.getAttribute('aria-pressed')) !== 'true') {
    await englishButton.click()
  }
  await expect(englishButton).toHaveAttribute('aria-pressed', 'true')
}

test('admin creates a persisted notification that the seeded student can open', async ({
  browser,
}) => {
  const notificationTitle = `E2E Notification ${Date.now()}`
  const notificationMessage = 'This notification verifies the admin-to-student E2E flow.'

  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  await signIn(adminPage, testAdminEmail, /\/admin\/student-dashboard$/)
  await adminPage.goto('/admin/notifications')
  await useEnglish(adminPage)
  await expect(
    adminPage.getByRole('heading', { name: 'Notification Management' }),
  ).toBeVisible()

  await adminPage.getByRole('button', { name: 'Add Notification' }).click()
  const createDialog = adminPage.getByRole('dialog', { name: 'Send Notification' })
  await createDialog.locator('#notification-title').fill(notificationTitle)
  await createDialog.locator('#notification-message').fill(notificationMessage)

  const createResponsePromise = adminPage.waitForResponse(
    (response) =>
      response.url().endsWith('/api/notifications') &&
      response.request().method() === 'POST',
  )
  await createDialog.getByRole('button', { name: 'Send Notification' }).click()
  const createResponse = await createResponsePromise
  expect(createResponse.status()).toBe(201)
  const createBody = await createResponse.json()
  expect(createBody.data).toMatchObject({
    title: notificationTitle,
    message: notificationMessage,
    targetAudience: 'All Students',
  })
  expect(createBody.data.notificationId).toEqual(expect.any(String))

  // Reloading verifies that the notification can be read back from persisted backend data.
  await adminPage.reload()
  await useEnglish(adminPage)
  await expect(
    adminPage.getByRole('table').getByText(notificationTitle, { exact: true }),
  ).toBeVisible()
  await adminContext.close()

  const studentContext = await browser.newContext()
  const studentPage = await studentContext.newPage()
  await signIn(studentPage, testStudentEmail, /\/student\/information$/)
  await studentPage.goto('/notifications')
  await useEnglish(studentPage)
  await expect(
    studentPage.getByRole('heading', { name: 'Notification', exact: true }),
  ).toBeVisible()

  const notificationTitleInList = studentPage.getByText(notificationTitle, { exact: true })
  await expect(notificationTitleInList).toBeVisible()
  await notificationTitleInList.click()

  const detailDialog = studentPage.getByRole('dialog', { name: notificationTitle })
  await expect(detailDialog).toBeVisible()
  await expect(detailDialog.getByText(notificationMessage, { exact: true })).toBeVisible()
  await studentContext.close()
})
