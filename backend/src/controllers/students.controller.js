import { findAllStudents } from '../services/students.service.js'

export async function getStudents(_request, response) {
  const students = await findAllStudents()

  response.json({ data: students })
}
