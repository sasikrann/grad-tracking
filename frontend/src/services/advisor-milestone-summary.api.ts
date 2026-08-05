import { apiRequest } from '@/services/api-client'
import type { AdvisorMilestoneSummary, DegreeLevel } from '@/types/milestone'

export async function getAdvisorMilestoneSummary(
  advisorId: string,
  filters: { degreeLevel?: DegreeLevel | 'all'; semester?: string; year?: string } = {},
) {
  const params = new URLSearchParams()

  if (filters.degreeLevel && filters.degreeLevel !== 'all') params.set('degreeLevel', filters.degreeLevel)
  if (filters.semester && filters.semester !== 'all') params.set('semester', filters.semester)
  if (filters.year && filters.year !== 'all') params.set('year', filters.year)

  const query = params.toString() ? `?${params.toString()}` : ''
  return apiRequest<AdvisorMilestoneSummary>(
    `/api/advisors/${encodeURIComponent(advisorId)}/milestone-summary${query}`,
    { errorMessage: 'Unable to load milestone summary' },
  )
}
