import { beforeEach, describe, expect, it, vi } from 'vitest'

const authenticatedFetch = vi.fn()

vi.mock('../auth', () => ({ authenticatedFetch }))

describe('api client', () => {
  beforeEach(() => authenticatedFetch.mockReset())

  it('unwraps successful API responses and adds JSON headers', async () => {
    authenticatedFetch.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: '1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { apiRequest } = await import('../api-client')
    await expect(apiRequest('/api/example', { body: '{}' })).resolves.toEqual({ id: '1' })

    const [, options] = authenticatedFetch.mock.calls[0] as [string, RequestInit]
    expect(new Headers(options.headers).get('Content-Type')).toBe('application/json')
  })

  it('does not add a JSON content type to multipart requests', async () => {
    authenticatedFetch.mockResolvedValue(
      new Response(JSON.stringify({ data: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { apiRequest } = await import('../api-client')
    await apiRequest('/api/upload', { method: 'POST', body: new FormData() })

    const [, options] = authenticatedFetch.mock.calls[0] as [string, RequestInit]
    expect(new Headers(options.headers).has('Content-Type')).toBe(false)
  })

  it('uses the server error message when a request fails', async () => {
    authenticatedFetch.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Validation failed' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const { apiRequest } = await import('../api-client')
    await expect(apiRequest('/api/example')).rejects.toThrow('Validation failed')
  })
})
