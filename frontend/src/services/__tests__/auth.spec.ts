import { beforeEach, describe, expect, it, vi } from 'vitest'

const adminUser = {
  userId: 'user-1',
  fullName: 'Admin User',
  email: 'admin@lamduan.mfu.ac.th',
  role: 'admin',
} as const

describe('auth service', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('stores the server-issued token and verified user after login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: { token: 'signed-token', user: adminUser },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    const { accessToken, currentUser, loginWithGoogleCredential } = await import('../auth')
    await loginWithGoogleCredential('google-credential')

    expect(accessToken.value).toBe('signed-token')
    expect(currentUser.value).toEqual(adminUser)
    expect(sessionStorage.getItem('accessToken')).toBe('signed-token')
  })

  it('clears an invalid stored session when the backend rejects it', async () => {
    sessionStorage.setItem('accessToken', 'invalid-token')
    sessionStorage.setItem('currentUser', JSON.stringify(adminUser))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))

    const { accessToken, currentUser, initializeAuth } = await import('../auth')
    await initializeAuth()

    expect(accessToken.value).toBeNull()
    expect(currentUser.value).toBeNull()
    expect(sessionStorage.getItem('accessToken')).toBeNull()
  })
})
