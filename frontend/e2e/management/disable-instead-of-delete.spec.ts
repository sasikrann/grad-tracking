import { expect, test, type Page } from '@playwright/test'

import { mockGoogleIdentity } from '../support/google-identity.mock'

const apiBaseUrl = 'http://localhost:3001'
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

async function apiRequest(
  page: Page,
  path: string,
  method = 'GET',
  body?: Record<string, unknown>,
) {
  return page.evaluate(
    async ({ url, method: requestMethod, body: requestBody }) => {
      const response = await fetch(url, {
        method: requestMethod,
        credentials: 'include',
        headers: requestBody ? { 'Content-Type': 'application/json' } : undefined,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      })
      const text = await response.text()
      return { status: response.status, body: text ? JSON.parse(text) : null }
    },
    { url: `${apiBaseUrl}${path}`, method, body },
  )
}

async function uploadEvidence(page: Page, milestoneId: string) {
  return page.evaluate(
    async ({ url }) => {
      const form = new FormData()
      form.append('file', new File([new Uint8Array([137, 80, 78, 71])], 'e2e-proof.png', {
        type: 'image/png',
      }))
      const response = await fetch(url, { method: 'PUT', credentials: 'include', body: form })
      const text = await response.text()
      return { status: response.status, body: text ? JSON.parse(text) : null }
    },
    { url: `${apiBaseUrl}/api/student-profile/me/milestones/${milestoneId}/evidence` },
  )
}

test('advisor and milestone records are disabled instead of deleted', async ({ browser }) => {
  const suffix = String(Date.now()).slice(-8)
  const advisorId = `E2E-D-${suffix}`
  const historicalTitle = `E2E retained milestone ${suffix}`
  const futureTitle = `E2E disabled milestone ${suffix}`

  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  await signIn(adminPage, testAdminEmail, /\/admin\/student-dashboard$/)

  await adminPage.goto('/admin/advisor-dashboard')
  await expect(adminPage.getByRole('button', { name: /delete advisor/i })).toHaveCount(0)
  await adminPage.goto('/milestones')
  await expect(adminPage.getByRole('button', { name: 'Delete milestone' })).toHaveCount(0)

  expect((await apiRequest(adminPage, `/api/advisors/${advisorId}`, 'DELETE')).status).toBe(404)
  expect(
    (await apiRequest(adminPage, '/api/milestones/00000000-0000-4000-8000-000000000000', 'DELETE'))
      .status,
  ).toBe(404)

  const advisorResponse = await apiRequest(adminPage, '/api/advisors', 'POST', {
    advisorId,
    fullName: `E2E Disable Advisor ${suffix}`,
    email: `e2e-disable-${suffix}@mfu.ac.th`,
  })
  expect(advisorResponse.status).toBe(201)

  const milestoneInput = (title: string, evidenceCode: string, sequenceOrder: number) => ({
    academicYear: 2026,
    degreeLevel: 'Doctoral',
    semester: 'all',
    plans: ['2.2'],
    prerequisiteMilestoneIds: [],
    evidenceCode,
    title,
    description: 'E2E record-retention verification',
    references: [],
    sequenceOrder,
    deadline: null,
    firstReminderDate: null,
    secondReminderDate: null,
    isEnabled: true,
  })
  const historicalResponse = await apiRequest(
    adminPage,
    '/api/milestones',
    'POST',
    milestoneInput(historicalTitle, `EH${suffix}`, 90),
  )
  const futureResponse = await apiRequest(
    adminPage,
    '/api/milestones',
    'POST',
    milestoneInput(futureTitle, `EF${suffix}`, 91),
  )
  expect(historicalResponse.status).toBe(201)
  expect(futureResponse.status).toBe(201)
  const historicalId = historicalResponse.body.data.milestoneId as string
  const futureId = futureResponse.body.data.milestoneId as string

  const studentContext = await browser.newContext()
  const studentPage = await studentContext.newPage()
  await signIn(studentPage, testStudentEmail, /\/student\/information$/)

  const activeAdvisors = await apiRequest(studentPage, '/api/advisors')
  expect(activeAdvisors.status).toBe(200)
  expect(activeAdvisors.body.data).toEqual(
    expect.arrayContaining([expect.objectContaining({ advisorId })]),
  )
  const appointment = await apiRequest(studentPage, '/api/student-profile/me/advisor', 'PUT', {
    advisorId,
  })
  expect(appointment.status).toBe(200)
  expect(appointment.body.data.advisorId).toBe(advisorId)

  const evidenceResponse = await uploadEvidence(studentPage, historicalId)
  expect(evidenceResponse.status).toBe(200)

  expect(
    (await apiRequest(adminPage, `/api/advisors/${advisorId}/status`, 'PATCH', {
      status: 'inactive',
    })).status,
  ).toBe(200)
  for (const milestoneId of [historicalId, futureId]) {
    expect(
      (await apiRequest(adminPage, `/api/milestones/${milestoneId}/enabled`, 'PATCH', {
        isEnabled: false,
      })).status,
    ).toBe(200)
  }

  const inactiveAdvisors = await apiRequest(studentPage, '/api/advisors')
  expect(inactiveAdvisors.body.data).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ advisorId })]),
  )
  const reassignment = await apiRequest(studentPage, '/api/student-profile/me/advisor', 'PUT', {
    advisorId,
  })
  expect(reassignment.status).toBe(400)

  const retainedProfile = await apiRequest(studentPage, '/api/student-profile/me')
  expect(retainedProfile.body.data.advisorId).toBe(advisorId)

  const studentMilestones = await apiRequest(studentPage, '/api/student-profile/me/milestones')
  expect(studentMilestones.body.data).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ milestoneId: historicalId, evidenceUrl: expect.any(String) }),
    ]),
  )
  expect(studentMilestones.body.data).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ milestoneId: futureId })]),
  )

  const notifications = await apiRequest(adminPage, '/api/notifications')
  expect(notifications.body.data).toEqual(
    expect.arrayContaining([expect.objectContaining({ milestoneId: historicalId })]),
  )

  expect((await apiRequest(adminPage, `/api/advisors/${advisorId}`, 'DELETE')).status).toBe(404)
  expect((await apiRequest(adminPage, `/api/milestones/${historicalId}`, 'DELETE')).status).toBe(404)
  expect((await apiRequest(adminPage, `/api/advisors/${advisorId}`)).status).toBe(200)
  expect((await apiRequest(adminPage, `/api/milestones/${historicalId}`)).status).toBe(200)

  await studentContext.close()
  await adminContext.close()
})
