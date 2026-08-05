import { apiRequest } from '@/services/api-client'
import type { DegreeLevel, Milestone, MilestoneInput } from '@/types/milestone'

const request = <T>(path: string, options?: RequestInit) =>
  apiRequest<T>(path, { ...options, errorMessage: 'Milestone request failed' })

export function getMilestones(degreeLevel?: DegreeLevel | 'all') {
  const query = degreeLevel && degreeLevel !== 'all' ? `?degreeLevel=${degreeLevel}` : ''
  return request<Milestone[]>(`/api/milestones${query}`)
}

export function createMilestone(input: MilestoneInput) {
  return request<Milestone>('/api/milestones', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateMilestone(milestoneId: string, input: MilestoneInput) {
  return request<Milestone>(`/api/milestones/${milestoneId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteMilestone(milestoneId: string) {
  return request<null>(`/api/milestones/${milestoneId}`, { method: 'DELETE' })
}

export function setMilestoneEnabled(milestoneId: string, isEnabled: boolean) {
  return request<Milestone>(`/api/milestones/${milestoneId}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ isEnabled }),
  })
}

export function moveMilestone(milestoneId: string, direction: 'up' | 'down') {
  return request<Milestone>(`/api/milestones/${milestoneId}/order`, {
    method: 'PATCH',
    body: JSON.stringify({ direction }),
  })
}

export function copyMilestones(
  fromDegreeLevel: DegreeLevel,
  toDegreeLevel: DegreeLevel,
  fromSemester: string,
  toSemester: string,
  toYear: string,
  milestoneIds: string[],
) {
  return request<{ copiedRecords: number }>('/api/milestones/copy', {
    method: 'POST',
    body: JSON.stringify({
      fromDegreeLevel,
      toDegreeLevel,
      fromSemester,
      toSemester,
      toYear,
      milestoneIds,
    }),
  })
}
