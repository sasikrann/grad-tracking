import { apiRequest } from '@/services/api-client'
import type { AdvisorMilestoneSummary, DegreeLevel } from '@/types/milestone'

export async function getAdvisorMilestoneSummary(
  advisorId: string,
  filters: { degreeLevel?: DegreeLevel | 'all'; educationPlan?: string; year?: string } = {},
) {
  const params = new URLSearchParams()

  if (filters.degreeLevel && filters.degreeLevel !== 'all')
    params.set('degreeLevel', filters.degreeLevel)
  if (filters.educationPlan && filters.educationPlan !== 'all') {
    params.set('educationPlan', filters.educationPlan)
  }
  if (filters.year && filters.year !== 'all') params.set('year', filters.year)

  const query = params.toString() ? `?${params.toString()}` : ''
  return apiRequest<AdvisorMilestoneSummary>(
    `/api/advisors/${encodeURIComponent(advisorId)}/milestone-summary${query}`,
    { errorMessage: 'Unable to load milestone summary' },
  )
}
