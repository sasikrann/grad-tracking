import { ApiError } from '../errors/api-error.js'
import { findAdvisorIdByUserId } from '../services/auth.service.js'
import { findStudentsByAdvisorId } from '../services/students.service.js'

export async function getAdvisorStudents(request, response) {
  const requestedAdvisorId = request.params.advisorId

  if (request.user.role === 'advisor') {
    const advisorId = await findAdvisorIdByUserId(request.user.userId)

    if (!advisorId || advisorId !== requestedAdvisorId) {
      throw new ApiError(403, 'You can only access your own advised students')
    }
  }

  const students = await findStudentsByAdvisorId(requestedAdvisorId)

  response.json({
    data: students,
  })
}
