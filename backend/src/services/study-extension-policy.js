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

export function extensionPeriodFromDate(date) {
  const [year, month] = date.split('-').map(Number)
  const targetMonthIndex = month - 1 + 4
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const targetMonth = (targetMonthIndex % 12) + 1
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()
  const pad = (value) => String(value).padStart(2, '0')

  return {
    startsOn: date,
    endsOn: `${targetYear}-${pad(targetMonth)}-${pad(lastDayOfTargetMonth)}`,
  }
}
