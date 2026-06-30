import { authenticatedFetch } from '@/services/auth'
import type { AdvisorMilestoneSummary, DegreeLevel } from '@/types/milestone'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface AdvisorMilestoneSummaryResponse {
  data?: AdvisorMilestoneSummary
  message?: string
}

export async function getAdvisorMilestoneSummary(
  advisorId: string,
  filters: { degreeLevel?: DegreeLevel | 'all'; semester?: string; year?: string } = {},
) {
  const params = new URLSearchParams()

  if (filters.degreeLevel && filters.degreeLevel !== 'all') params.set('degreeLevel', filters.degreeLevel)
  if (filters.semester && filters.semester !== 'all') params.set('semester', filters.semester)
  if (filters.year && filters.year !== 'all') params.set('year', filters.year)

  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await authenticatedFetch(
    `${apiBaseUrl}/api/advisors/${advisorId}/milestone-summary${query}`,
  )
  const result = (await response.json().catch(() => null)) as AdvisorMilestoneSummaryResponse | null

  if (!response.ok) {
    throw new Error(result?.message ?? `Unable to load milestone summary (${response.status})`)
  }

  return (
    result?.data ?? {
      counts: { completed: 0, inProgress: 0, approved: 0, missing: 0, total: 0 },
      overallProgress: 0,
      milestones: [],
      filters: { degreeLevels: [], semesters: [], years: [] },
    }
  )
}
