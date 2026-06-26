// Controller สำหรับจัดการ Milestone
// เอาไว้ให้ Admin สร้าง แก้ไข ลบ เปิด-ปิด เรียงลำดับ และคัดลอก milestone
import { ApiError } from '../errors/api-error.js'
import {
  copyMilestones,
  createMilestone,
  findMilestones,
  findMilestoneById,
  moveMilestone,
  nextSequenceOrder,
  removeMilestone,
  setMilestoneEnabled,
  updateMilestone,
} from '../services/milestones.service.js'

const degreeLevels = new Set(['Master', 'Doctoral'])
const semesters = new Set(['1', '2'])

function requiredText(value, field) {
  const result = String(value ?? '').trim()
  if (!result) throw new ApiError(400, `${field} is required`)
  return result
}

function optionalText(value) {
  return String(value ?? '').trim() || null
}

function requiredDate(value, field) {
  const result = requiredText(value, field)
  if (Number.isNaN(Date.parse(result))) throw new ApiError(400, `${field} must be a valid date`)
  return result
}

function optionalDate(value, field) {
  const result = optionalText(value)
  if (result && Number.isNaN(Date.parse(result))) throw new ApiError(400, `${field} must be a valid date`)
  return result
}

function requiredSemester(value) {
  const semester = requiredText(value, 'semester')
  if (!semesters.has(semester)) throw new ApiError(400, 'semester must be 1 or 2')
  return semester
}

function optionalSemester(value) {
  const semester = optionalText(value)
  if (semester && !semesters.has(semester)) throw new ApiError(400, 'semester must be 1 or 2')
  return semester
}

function normalizeMilestone(body) {
  const degreeLevel = requiredText(body.degreeLevel, 'degreeLevel')
  if (!degreeLevels.has(degreeLevel)) throw new ApiError(400, 'degreeLevel must be Master or Doctoral')

  return {
    degreeLevel,
    semester: requiredSemester(body.semester ?? '1'),
    title: requiredText(body.title, 'title'),
    description: optionalText(body.description),
    sequenceOrder: body.sequenceOrder ? Number(body.sequenceOrder) : null,
    openDate: requiredDate(body.openDate, 'openDate'),
    deadline: requiredDate(body.deadline, 'deadline'),
    firstReminderDate: optionalDate(body.firstReminderDate, 'firstReminderDate'),
    secondReminderDate: optionalDate(body.secondReminderDate, 'secondReminderDate'),
    isEnabled: body.isEnabled !== false,
  }
}

export async function getMilestones(request, response) {
  const degreeLevel = String(request.query.degreeLevel ?? '').trim()
  const semester = optionalSemester(request.query.semester)
  response.json({ data: await findMilestones({ degreeLevel: degreeLevel || null, semester }) })
}

export async function getMilestone(request, response) {
  const milestone = await findMilestoneById(request.params.milestoneId)
  if (!milestone) throw new ApiError(404, 'Milestone not found')
  response.json({ data: milestone })
}

export async function getNextMilestoneOrder(request, response) {
  const degreeLevel = requiredText(request.query.degreeLevel, 'degreeLevel')
  const semester = requiredSemester(request.query.semester ?? '1')
  response.json({ data: { sequenceOrder: await nextSequenceOrder(degreeLevel, semester) } })
}

export async function addMilestone(request, response) {
  const milestone = await createMilestone(normalizeMilestone(request.body))
  response.status(201).json({ data: milestone })
}

export async function editMilestone(request, response) {
  const milestone = await updateMilestone(request.params.milestoneId, normalizeMilestone(request.body))
  if (!milestone) throw new ApiError(404, 'Milestone not found')
  response.json({ data: milestone })
}

export async function deleteMilestone(request, response) {
  if (!(await removeMilestone(request.params.milestoneId))) {
    throw new ApiError(404, 'Milestone not found')
  }
  response.status(204).send()
}

export async function toggleMilestone(request, response) {
  const milestone = await setMilestoneEnabled(request.params.milestoneId, Boolean(request.body.isEnabled))
  if (!milestone) throw new ApiError(404, 'Milestone not found')
  response.json({ data: milestone })
}

export async function reorderMilestone(request, response) {
  const direction = String(request.body.direction ?? '')
  if (!['up', 'down'].includes(direction)) throw new ApiError(400, 'direction must be up or down')

  const milestone = await moveMilestone(request.params.milestoneId, direction)
  if (!milestone) throw new ApiError(404, 'Milestone not found')
  response.json({ data: milestone })
}

export async function copyMilestoneSet(request, response) {
  const fromDegreeLevel = requiredText(request.body.fromDegreeLevel, 'fromDegreeLevel')
  const toDegreeLevel = requiredText(request.body.toDegreeLevel, 'toDegreeLevel')
  const fromSemester = optionalSemester(request.body.fromSemester)
  const toSemester = requiredSemester(request.body.toSemester ?? '1')
  const milestoneIds = Array.isArray(request.body.milestoneIds) ? request.body.milestoneIds : []
  if (!degreeLevels.has(fromDegreeLevel) || !degreeLevels.has(toDegreeLevel)) {
    throw new ApiError(400, 'degree levels must be Master or Doctoral')
  }

  response.status(201).json({
    data: {
      copiedRecords: await copyMilestones({
        fromDegreeLevel,
        toDegreeLevel,
        fromSemester,
        toSemester,
        milestoneIds,
      }),
    },
  })
}
