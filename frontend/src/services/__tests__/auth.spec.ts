import { beforeEach, describe, expect, it, vi } from 'vitest'

const adminUser = {
  userId: 'user-1',
  fullName: 'Admin User',
  email: 'admin@lamduan.mfu.ac.th',
  role: 'admin',
} as const

describe('auth service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('stores the verified user after the backend creates an HttpOnly cookie session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { user: adminUser } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { currentUser, loginWithGoogleCredential } = await import('../auth')
    await loginWithGoogleCredential('google-credential')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/google$/),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
    expect(currentUser.value).toEqual(adminUser)
  })

  it('stores a development user after the backend creates an HttpOnly cookie session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { user: adminUser } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { currentUser, loginForDevelopment } = await import('../auth')
    await loginForDevelopment(adminUser.email)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/dev-login$/),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
    expect(currentUser.value).toEqual(adminUser)
  })

  it('clears the current user when the backend rejects the cookie session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))

    const { currentUser, initializeAuth } = await import('../auth')
    await initializeAuth()

    expect(currentUser.value).toBeNull()
  })
})
