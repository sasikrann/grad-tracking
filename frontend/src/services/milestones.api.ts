import { apiRequest } from '@/services/api-client'
import type { DegreeLevel, Milestone, MilestoneInput } from '@/types/milestone'

const request = <T>(path: string, options?: RequestInit) =>
  apiRequest<T>(path, { ...options, errorMessage: 'Milestone request failed' })

// Loads milestone templates, optionally filtered by degree level.
export function getMilestones(degreeLevel?: DegreeLevel | 'all') {
  const query = degreeLevel && degreeLevel !== 'all' ? `?degreeLevel=${degreeLevel}` : ''
  return request<Milestone[]>(`/api/milestones${query}`)
}

// Creates a milestone template from validated form data.
export function createMilestone(input: MilestoneInput) {
  return request<Milestone>('/api/milestones', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

// Updates a milestone globally or only within one plan scope.
export function updateMilestone(milestoneId: string, input: MilestoneInput, scopePlan?: string) {
  return request<Milestone>(`/api/milestones/${milestoneId}`, {
    method: 'PUT',
    body: JSON.stringify({ ...input, scopePlan }),
  })
}

// Enables or disables a milestone without deleting it.
export function setMilestoneEnabled(milestoneId: string, isEnabled: boolean) {
  return request<Milestone>(`/api/milestones/${milestoneId}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ isEnabled }),
  })
}

// Moves a milestone one position up or down.
export function moveMilestone(milestoneId: string, direction: 'up' | 'down') {
  return request<Milestone>(`/api/milestones/${milestoneId}/order`, {
    method: 'PATCH',
    body: JSON.stringify({ direction }),
  })
}

// Copies milestone templates between academic years.
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
// Calls administrator milestone endpoints for listing, creation, editing, ordering, and copying.
