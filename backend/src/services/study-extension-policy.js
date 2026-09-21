export const MAX_STUDY_EXTENSIONS = 2

export function maximumStudyYears(degreeLevel, educationPlan) {
  if (degreeLevel === 'Master') return 4
  if (degreeLevel === 'Doctoral' && educationPlan === '2.2') return 7
  if (degreeLevel === 'Doctoral') return 5
  return null
}

export function normalStudyEndDate(student) {
  const years = maximumStudyYears(student.degreeLevel, student.educationPlan)
  if (!years) return null

  const enrollmentYear = Number(student.enrollmentAcademicYear)
  if (String(student.semester) === '2') {
    return `${enrollmentYear + years}-12-31`
  }
  return `${enrollmentYear + years}-05-31`
}

export function isPastNormalStudyPeriod(student, currentDate) {
  const endDate = normalStudyEndDate(student)
  return Boolean(endDate && currentDate > endDate)
}

export function academicTermForDate(date) {
  const [year, month] = date.split('-').map(Number)
  if (month >= 8) {
    return { academicYear: year, semester: '1', startsOn: `${year}-08-01`, endsOn: `${year}-12-31` }
  }
  if (month <= 5) {
    return { academicYear: year - 1, semester: '2', startsOn: `${year}-01-01`, endsOn: `${year}-05-31` }
  }
  return { academicYear: year, semester: '1', startsOn: `${year}-08-01`, endsOn: `${year}-12-31` }
}

export function nextAcademicTerm(term) {
  if (term.semester === '1') {
    const year = term.academicYear + 1
    return { academicYear: term.academicYear, semester: '2', startsOn: `${year}-01-01`, endsOn: `${year}-05-31` }
  }
  const year = term.academicYear + 1
  return { academicYear: year, semester: '1', startsOn: `${year}-08-01`, endsOn: `${year}-12-31` }
}
