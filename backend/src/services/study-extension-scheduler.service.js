import pool from '../config/database.js'

const dailyIntervalMs = 24 * 60 * 60 * 1000

let firstRunTimer
let dailyTimer

// Persists dismissal after the second extension has ended, while preserving graduates.
export async function dismissStudentsWithExpiredExtensions(database = pool) {
  const result = await database.query(`
    UPDATE students s
    SET student_status = 'Dismissed', updated_at = NOW()
    WHERE s.student_status = 'Normal'
      AND s.graduation_semester IS NULL
      AND s.graduation_academic_year IS NULL
      AND (
        SELECT COUNT(*)
        FROM student_study_extensions e
        WHERE e.student_id = s.student_id
          AND e.status = 'Granted'
      ) = 2
      AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date > (
        SELECT MAX(e.ends_on)
        FROM student_study_extensions e
        WHERE e.student_id = s.student_id
          AND e.status = 'Granted'
      )
    RETURNING s.student_id
  `)
  return result.rows
}

async function runDismissalCheck() {
  try {
    const dismissed = await dismissStudentsWithExpiredExtensions()
    console.info({ event: 'study_extension_dismissal_check', studentsDismissed: dismissed.length })
  } catch (error) {
    console.error({
      event: 'study_extension_dismissal_check_failed',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

function millisecondsUntilNextBangkokRun(now = new Date()) {
  const bangkokOffsetMs = 7 * 60 * 60 * 1000
  const bangkokNow = new Date(now.getTime() + bangkokOffsetMs)
  const nextRunUtc = Date.UTC(
    bangkokNow.getUTCFullYear(),
    bangkokNow.getUTCMonth(),
    bangkokNow.getUTCDate() + 1,
    0,
    5,
  ) - bangkokOffsetMs
  return nextRunUtc - now.getTime()
}

export function startStudyExtensionScheduler() {
  if (firstRunTimer || dailyTimer) return
  void runDismissalCheck()
  firstRunTimer = setTimeout(() => {
    void runDismissalCheck()
    dailyTimer = setInterval(runDismissalCheck, dailyIntervalMs)
    firstRunTimer = undefined
  }, millisecondsUntilNextBangkokRun())
}

export function stopStudyExtensionScheduler() {
  if (firstRunTimer) clearTimeout(firstRunTimer)
  if (dailyTimer) clearInterval(dailyTimer)
  firstRunTimer = undefined
  dailyTimer = undefined
}

