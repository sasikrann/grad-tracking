import { randomUUID } from 'node:crypto'

import pool from '../config/database.js'

let schemaReady

const milestoneColumns = `
  milestone_id AS "milestoneId",
  degree_level AS "degreeLevel",
  semester,
  title,
  description,
  sequence_order AS "sequenceOrder",
  open_date AS "openDate",
  deadline,
  first_reminder_date AS "firstReminderDate",
  second_reminder_date AS "secondReminderDate",
  is_enabled AS "isEnabled",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`

const maxRejectedRevisionRounds = 3

async function ensureMilestoneSchema() {
  schemaReady ??= pool.query(`
    ALTER TABLE milestone_templates
    ADD COLUMN IF NOT EXISTS semester VARCHAR NOT NULL DEFAULT '1'
  `)
    .then(() => pool.query(`
      ALTER TABLE student_milestones
      ADD COLUMN IF NOT EXISTS rejection_count INT NOT NULL DEFAULT 0
    `))
    .then(() => pool.query(`
      ALTER TABLE student_milestones
      ADD CONSTRAINT student_milestones_student_milestone_unique UNIQUE (student_id, milestone_id)
    `)
    .catch((error) => {
      if (!['42710', '42P07'].includes(error.code)) throw error
    }))
  await schemaReady
}

export async function findMilestones({ degreeLevel, semester } = {}) {
  await ensureMilestoneSchema()

  const conditions = []
  const values = []

  if (degreeLevel) {
    values.push(degreeLevel)
    conditions.push(`degree_level = $${values.length}`)
  }

  if (semester) {
    values.push(semester)
    conditions.push(`semester = $${values.length}`)
  }

  const filter = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const result = await pool.query(
    `
      SELECT ${milestoneColumns}
      FROM milestone_templates
      ${filter}
      ORDER BY degree_level, semester, sequence_order, created_at
    `,
    values,
  )

  return result.rows
}

export async function findStudentMilestonesByUserId(userId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT
        mt.milestone_id AS "milestoneId",
        mt.degree_level AS "degreeLevel",
        mt.semester,
        mt.title,
        mt.description,
        mt.sequence_order AS "sequenceOrder",
        mt.open_date AS "openDate",
        mt.deadline,
        mt.first_reminder_date AS "firstReminderDate",
        mt.second_reminder_date AS "secondReminderDate",
        mt.open_date > CURRENT_DATE AS "isLocked",
        COALESCE(
          sm.status,
          CASE
            WHEN mt.deadline < CURRENT_DATE THEN 'Missing'::milestone_status
            ELSE 'In Progress'::milestone_status
          END
        ) AS status,
        sm.evidence_url AS "evidenceUrl",
        sm.advisor_comment AS "advisorComment",
        COALESCE(sm.rejection_count, 0) AS "rejectionCount",
        ${maxRejectedRevisionRounds} AS "maxRejectedRevisionRounds",
        sm.submitted_at AS "submittedAt",
        sm.reviewed_at AS "reviewedAt"
      FROM students s
      JOIN milestone_templates mt
        ON mt.degree_level = s.degree_level
        AND mt.is_enabled = TRUE
      LEFT JOIN student_milestones sm
        ON sm.student_id = s.student_id
        AND sm.milestone_id = mt.milestone_id
      WHERE s.user_id = $1
      ORDER BY mt.semester, mt.sequence_order, mt.created_at
    `,
    [userId],
  )

  return result.rows
}

export async function findStudentMilestonesByStudentId(studentId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT
        s.student_id AS "studentId",
        s.full_name AS "studentName",
        mt.milestone_id AS "milestoneId",
        mt.degree_level AS "degreeLevel",
        mt.semester,
        mt.title,
        mt.description,
        mt.sequence_order AS "sequenceOrder",
        mt.open_date AS "openDate",
        mt.deadline,
        mt.first_reminder_date AS "firstReminderDate",
        mt.second_reminder_date AS "secondReminderDate",
        COALESCE(
          sm.status,
          CASE
            WHEN mt.deadline < CURRENT_DATE THEN 'Missing'::milestone_status
            ELSE 'In Progress'::milestone_status
          END
        ) AS status,
        sm.evidence_url AS "evidenceUrl",
        sm.advisor_comment AS "advisorComment",
        COALESCE(sm.rejection_count, 0) AS "rejectionCount",
        ${maxRejectedRevisionRounds} AS "maxRejectedRevisionRounds",
        sm.submitted_at AS "submittedAt",
        sm.reviewed_at AS "reviewedAt"
      FROM students s
      LEFT JOIN milestone_templates mt
        ON mt.degree_level = s.degree_level
        AND mt.is_enabled = TRUE
      LEFT JOIN student_milestones sm
        ON sm.student_id = s.student_id
        AND sm.milestone_id = mt.milestone_id
      WHERE s.student_id = $1
      ORDER BY mt.semester, mt.sequence_order, mt.created_at
    `,
    [studentId],
  )

  if (!result.rows.length) return null

  return {
    student: {
      studentId: result.rows[0].studentId,
      studentName: result.rows[0].studentName,
    },
    milestones: result.rows
      .filter((row) => row.milestoneId)
      .map(({ studentId: _studentId, studentName: _studentName, ...milestone }) => milestone),
  }
}

export async function findAdvisorStudentMilestones(advisorUserId, studentId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT
        s.student_id AS "studentId",
        s.full_name AS "studentName",
        mt.milestone_id AS "milestoneId",
        mt.degree_level AS "degreeLevel",
        mt.semester,
        mt.title,
        mt.description,
        mt.sequence_order AS "sequenceOrder",
        mt.open_date AS "openDate",
        mt.deadline,
        mt.first_reminder_date AS "firstReminderDate",
        mt.second_reminder_date AS "secondReminderDate",
        COALESCE(
          sm.status,
          CASE
            WHEN mt.deadline < CURRENT_DATE THEN 'Missing'::milestone_status
            ELSE 'In Progress'::milestone_status
          END
        ) AS status,
        sm.evidence_url AS "evidenceUrl",
        sm.advisor_comment AS "advisorComment",
        COALESCE(sm.rejection_count, 0) AS "rejectionCount",
        ${maxRejectedRevisionRounds} AS "maxRejectedRevisionRounds",
        sm.submitted_at AS "submittedAt",
        sm.reviewed_at AS "reviewedAt"
      FROM advisors a
      JOIN students s
        ON s.advisor_id = a.advisor_id
        AND s.student_id = $2
      LEFT JOIN milestone_templates mt
        ON mt.degree_level = s.degree_level
        AND mt.is_enabled = TRUE
      LEFT JOIN student_milestones sm
        ON sm.student_id = s.student_id
        AND sm.milestone_id = mt.milestone_id
      WHERE a.user_id = $1
      ORDER BY mt.semester, mt.sequence_order, mt.created_at
    `,
    [advisorUserId, studentId],
  )

  if (!result.rows.length) return null

  return {
    student: {
      studentId: result.rows[0].studentId,
      studentName: result.rows[0].studentName,
    },
    milestones: result.rows
      .filter((row) => row.milestoneId)
      .map(({ studentId: _studentId, studentName: _studentName, ...milestone }) => milestone),
  }
}

export async function submitStudentMilestoneEvidence(userId, milestoneId, evidenceUrl) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      INSERT INTO student_milestones (
        student_milestone_id, student_id, milestone_id, status, evidence_url, submitted_at, updated_at
      )
      SELECT
        $4,
        s.student_id,
        mt.milestone_id,
        'Completed',
        $3,
        NOW(),
        NOW()
      FROM students s
      JOIN milestone_templates mt
        ON mt.milestone_id = $2
        AND mt.degree_level = s.degree_level
        AND mt.is_enabled = TRUE
        AND mt.open_date <= CURRENT_DATE
      LEFT JOIN student_milestones existing_sm
        ON existing_sm.student_id = s.student_id
        AND existing_sm.milestone_id = mt.milestone_id
      WHERE s.user_id = $1
        AND COALESCE(existing_sm.rejection_count, 0) < ${maxRejectedRevisionRounds}
      ON CONFLICT (student_id, milestone_id) DO UPDATE SET
        status = 'Completed'::milestone_status,
        evidence_url = EXCLUDED.evidence_url,
        advisor_comment = NULL,
        submitted_at = NOW(),
        reviewed_at = NULL,
        reviewed_by = NULL,
        updated_at = NOW()
      RETURNING milestone_id
    `,
    [userId, milestoneId, evidenceUrl, randomUUID()],
  )

  return result.rowCount > 0
}

export async function hasReachedRejectedRevisionLimit(userId, milestoneId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT 1
      FROM students s
      JOIN student_milestones sm
        ON sm.student_id = s.student_id
        AND sm.milestone_id = $2
      WHERE s.user_id = $1
        AND sm.rejection_count >= ${maxRejectedRevisionRounds}
    `,
    [userId, milestoneId],
  )

  return result.rowCount > 0
}

export async function clearStudentMilestoneEvidence(userId, milestoneId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      UPDATE student_milestones sm
      SET
        status = 'In Progress',
        evidence_url = NULL,
        advisor_comment = NULL,
        submitted_at = NULL,
        reviewed_at = NULL,
        reviewed_by = NULL,
        updated_at = NOW()
      FROM students s
      WHERE sm.student_id = s.student_id
        AND s.user_id = $1
        AND sm.milestone_id = $2
        AND sm.status <> 'Approved'
      RETURNING sm.milestone_id
    `,
    [userId, milestoneId],
  )

  return result.rowCount > 0
}

export async function reviewStudentMilestone({
  reviewerUserId,
  studentId,
  milestoneId,
  status,
  advisorComment,
}) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      UPDATE student_milestones sm
      SET
        status = $4::milestone_status,
        advisor_comment = $5,
        rejection_count = CASE
          WHEN $4 = 'In Progress' THEN LEAST(sm.rejection_count + 1, ${maxRejectedRevisionRounds})
          ELSE sm.rejection_count
        END,
        evidence_url = CASE WHEN $4 = 'In Progress' THEN NULL ELSE sm.evidence_url END,
        submitted_at = CASE WHEN $4 = 'In Progress' THEN NULL ELSE sm.submitted_at END,
        reviewed_at = NOW(),
        reviewed_by = a.advisor_id,
        updated_at = NOW()
      FROM students s
      JOIN advisors a ON a.advisor_id = s.advisor_id
      WHERE sm.student_id = s.student_id
        AND s.student_id = $1
        AND sm.milestone_id = $2
        AND a.user_id = $3
        AND sm.evidence_url IS NOT NULL
      RETURNING sm.student_milestone_id
    `,
    [studentId, milestoneId, reviewerUserId, status, advisorComment],
  )

  return result.rowCount > 0
}

export async function findAdvisorMilestoneSubmissions(advisorUserId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT
        s.student_id AS "studentId",
        s.full_name AS "studentName",
        mt.milestone_id AS "milestoneId",
        mt.title,
        mt.description,
        mt.deadline,
        sm.status,
        sm.evidence_url AS "evidenceUrl",
        sm.advisor_comment AS "advisorComment",
        COALESCE(sm.rejection_count, 0) AS "rejectionCount",
        ${maxRejectedRevisionRounds} AS "maxRejectedRevisionRounds",
        sm.submitted_at AS "submittedAt",
        sm.reviewed_at AS "reviewedAt"
      FROM advisors a
      JOIN students s ON s.advisor_id = a.advisor_id
      JOIN student_milestones sm ON sm.student_id = s.student_id
      JOIN milestone_templates mt ON mt.milestone_id = sm.milestone_id
      WHERE a.user_id = $1
        AND sm.evidence_url IS NOT NULL
      ORDER BY sm.submitted_at DESC NULLS LAST, mt.deadline, s.student_id
    `,
    [advisorUserId],
  )

  return result.rows
}

export async function findMilestoneById(milestoneId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT ${milestoneColumns}
      FROM milestone_templates
      WHERE milestone_id = $1
    `,
    [milestoneId],
  )

  return result.rows[0] || null
}

export async function nextSequenceOrder(degreeLevel, semester = '1') {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT COALESCE(MAX(sequence_order), 0) + 1 AS "nextOrder"
      FROM milestone_templates
      WHERE degree_level = $1 AND semester = $2
    `,
    [degreeLevel, semester],
  )

  return result.rows[0].nextOrder
}

export async function createMilestone(input) {
  await ensureMilestoneSchema()

  const milestoneId = randomUUID()
  const sequenceOrder =
    input.sequenceOrder || (await nextSequenceOrder(input.degreeLevel, input.semester))

  await pool.query(
    `
      INSERT INTO milestone_templates (
        milestone_id, degree_level, semester, title, description, sequence_order,
        open_date, deadline, first_reminder_date, second_reminder_date, is_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
    [
      milestoneId,
      input.degreeLevel,
      input.semester,
      input.title,
      input.description,
      sequenceOrder,
      input.openDate,
      input.deadline,
      input.firstReminderDate,
      input.secondReminderDate,
      input.isEnabled,
    ],
  )

  return findMilestoneById(milestoneId)
}

export async function updateMilestone(milestoneId, input) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      UPDATE milestone_templates
      SET
        degree_level = $2,
        semester = $3,
        title = $4,
        description = $5,
        sequence_order = $6,
        open_date = $7,
        deadline = $8,
        first_reminder_date = $9,
        second_reminder_date = $10,
        is_enabled = $11,
        updated_at = NOW()
      WHERE milestone_id = $1
    `,
    [
      milestoneId,
      input.degreeLevel,
      input.semester,
      input.title,
      input.description,
      input.sequenceOrder,
      input.openDate,
      input.deadline,
      input.firstReminderDate,
      input.secondReminderDate,
      input.isEnabled,
    ],
  )

  if (!result.rowCount) return null
  return findMilestoneById(milestoneId)
}

export async function removeMilestone(milestoneId) {
  await ensureMilestoneSchema()

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const current = await client.query(
      'SELECT degree_level, semester FROM milestone_templates WHERE milestone_id = $1 FOR UPDATE',
      [milestoneId],
    )
    const milestone = current.rows[0]
    if (!milestone) {
      await client.query('ROLLBACK')
      return false
    }

    await client.query('DELETE FROM student_milestones WHERE milestone_id = $1', [milestoneId])
    const result = await client.query('DELETE FROM milestone_templates WHERE milestone_id = $1', [
      milestoneId,
    ])

    await client.query(
      `
        WITH ordered_milestones AS (
          SELECT
            milestone_id,
            ROW_NUMBER() OVER (ORDER BY sequence_order, created_at) AS next_order
          FROM milestone_templates
          WHERE degree_level = $1 AND semester = $2
        )
        UPDATE milestone_templates mt
        SET sequence_order = ordered_milestones.next_order,
            updated_at = NOW()
        FROM ordered_milestones
        WHERE mt.milestone_id = ordered_milestones.milestone_id
          AND mt.sequence_order <> ordered_milestones.next_order
      `,
      [milestone.degree_level, milestone.semester],
    )

    await client.query('COMMIT')
    return result.rowCount > 0
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function setMilestoneEnabled(milestoneId, isEnabled) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      UPDATE milestone_templates
      SET is_enabled = $2, updated_at = NOW()
      WHERE milestone_id = $1
    `,
    [milestoneId, isEnabled],
  )

  if (!result.rowCount) return null
  return findMilestoneById(milestoneId)
}

export async function moveMilestone(milestoneId, direction) {
  await ensureMilestoneSchema()

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const current = await client.query(
      'SELECT milestone_id, degree_level, semester, sequence_order FROM milestone_templates WHERE milestone_id = $1 FOR UPDATE',
      [milestoneId],
    )
    const milestone = current.rows[0]
    if (!milestone) {
      await client.query('ROLLBACK')
      return null
    }

    const operator = direction === 'up' ? '<' : '>'
    const order = direction === 'up' ? 'DESC' : 'ASC'
    const neighbor = await client.query(
      `
        SELECT milestone_id, sequence_order
        FROM milestone_templates
        WHERE degree_level = $1 AND semester = $2 AND sequence_order ${operator} $3
        ORDER BY sequence_order ${order}
        LIMIT 1
        FOR UPDATE
      `,
      [milestone.degree_level, milestone.semester, milestone.sequence_order],
    )

    const target = neighbor.rows[0]
    if (!target) {
      await client.query('COMMIT')
      return findMilestoneById(milestoneId)
    }

    await client.query('UPDATE milestone_templates SET sequence_order = $2, updated_at = NOW() WHERE milestone_id = $1', [
      milestone.milestone_id,
      target.sequence_order,
    ])
    await client.query('UPDATE milestone_templates SET sequence_order = $2, updated_at = NOW() WHERE milestone_id = $1', [
      target.milestone_id,
      milestone.sequence_order,
    ])

    await client.query('COMMIT')
    return findMilestoneById(milestoneId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

function shiftDateToYear(value, year) {
  if (!value || !year) return value

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  date.setUTCFullYear(Number(year))
  return date.toISOString().slice(0, 10)
}

export async function copyMilestones({
  fromDegreeLevel,
  toDegreeLevel,
  fromSemester = null,
  toSemester = '1',
  toYear = null,
  milestoneIds = [],
}) {
  await ensureMilestoneSchema()

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const values = [fromDegreeLevel]
    const semesterFilter = fromSemester ? `AND semester = $${values.length + 1}` : ''
    if (fromSemester) values.push(fromSemester)

    const selectedFilter = milestoneIds.length
      ? `AND milestone_id = ANY($${values.length + 1}::uuid[])`
      : ''
    if (milestoneIds.length) values.push(milestoneIds)

    const source = await client.query(
      `
        SELECT milestone_id, title, description, sequence_order, open_date, deadline,
          first_reminder_date, second_reminder_date, is_enabled
        FROM milestone_templates
        WHERE degree_level = $1
        ${semesterFilter}
        ${selectedFilter}
        ORDER BY sequence_order
      `,
      values,
    )

    await client.query(
      `
        SELECT milestone_id
        FROM milestone_templates
        WHERE degree_level = $1 AND semester = $2
        FOR UPDATE
      `,
      [toDegreeLevel, toSemester],
    )

    const orderResult = await client.query(
      `
        SELECT COALESCE(MAX(sequence_order), 0) AS "maxOrder"
        FROM milestone_templates
        WHERE degree_level = $1 AND semester = $2
      `,
      [toDegreeLevel, toSemester],
    )
    let nextOrder = Number(orderResult.rows[0].maxOrder) + 1

    for (const row of source.rows) {
      await client.query(
        `
          INSERT INTO milestone_templates (
            milestone_id, degree_level, semester, title, description, sequence_order,
            open_date, deadline, first_reminder_date, second_reminder_date, is_enabled
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          randomUUID(),
          toDegreeLevel,
          toSemester,
          row.title,
          row.description,
          nextOrder,
          shiftDateToYear(row.open_date, toYear),
          shiftDateToYear(row.deadline, toYear),
          shiftDateToYear(row.first_reminder_date, toYear),
          shiftDateToYear(row.second_reminder_date, toYear),
          row.is_enabled,
        ],
      )
      nextOrder += 1
    }

    await client.query('COMMIT')
    return source.rowCount
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
