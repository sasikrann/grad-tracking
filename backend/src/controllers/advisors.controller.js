import { findStudentsByAdvisorId } from '../services/advisors.service.js'

export async function getAdvisorStudents(request, response) {
  const students = await findStudentsByAdvisorId(request.params.advisorId)

  response.json({
    data: students,
  })
}
