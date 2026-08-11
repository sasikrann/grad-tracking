import { randomUUID } from 'node:crypto'

import pool from '../config/database.js'
import { defaultMilestoneTemplates } from '../data/default-milestone-templates.js'
import { defaultMilestoneTemplateVersion } from './milestone.constants.js'
import { createMilestoneReminderNotification } from './notifications.service.js'

let schemaReady

const milestoneColumns = `
  milestone_id AS "milestoneId",
  academic_year AS "academicYear",
  degree_level AS "degreeLevel",
  semester,
  plans,
  prerequisite_milestone_ids AS "prerequisiteMilestoneIds",
  title,
  description,
  reference_urls AS references,
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
async function seedDefaultMilestoneTemplates() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const milestoneIdByKey = new Map()
    const initializedKeys = new Set()

    for (const template of defaultMilestoneTemplates) {
      let result = await client.query(
        `
          SELECT milestone_id, default_template_version
          FROM milestone_templates
          WHERE default_template_key = $1
        `,
        [template.key],
      )

      if (
        result.rowCount &&
        result.rows[0].default_template_version < defaultMilestoneTemplateVersion
      ) {
        initializedKeys.add(template.key)
      }

      if (!result.rowCount) {
        const matchingTitles = [template.title, ...(template.aliases ?? [])].map((title) =>
          title.toLowerCase(),
        )
        result = await client.query(
          `
            SELECT milestone_id
            FROM milestone_templates
            WHERE default_template_key IS NULL
              AND LOWER(title) = ANY($1::TEXT[])
            ORDER BY created_at
            LIMIT 1
          `,
          [matchingTitles],
        )

        if (result.rowCount) {
          await client.query(
            'UPDATE milestone_templates SET default_template_key = $2 WHERE milestone_id = $1',
            [result.rows[0].milestone_id, template.key],
          )
        } else {
          const milestoneId = randomUUID()
          await client.query(
            `
              INSERT INTO milestone_templates (
                milestone_id, default_template_key, degree_level, semester, plans,
                prerequisite_milestone_ids, title, description, reference_urls,
                sequence_order, open_date, deadline, first_reminder_date,
                second_reminder_date, is_enabled, default_template_version
              )
              VALUES ($1, $2, $3, 'all', $4, ARRAY[]::VARCHAR[], $5, $6,
                $7, $8, NULL, NULL, NULL, NULL, TRUE, $9)
            `,
            [
              milestoneId,
              template.key,
              template.degreeLevel,
              template.plans,
              template.title,
              template.description,
              template.references,
              template.sequenceOrder,
              defaultMilestoneTemplateVersion,
            ],
          )
          result = { rows: [{ milestone_id: milestoneId }], rowCount: 1 }
        }
        initializedKeys.add(template.key)
      }

      milestoneIdByKey.set(template.key, result.rows[0].milestone_id)
    }

    for (const template of defaultMilestoneTemplates) {
      if (!initializedKeys.has(template.key)) continue
      const prerequisiteIds = template.prerequisites
        .map((key) => milestoneIdByKey.get(key))
        .filter(Boolean)
      await client.query(
        `
          UPDATE milestone_templates
          SET degree_level = $2,
              semester = 'all',
              plans = $3,
              title = $4,
              description = $5,
              reference_urls = $6,
              sequence_order = $7,
              prerequisite_milestone_ids = $8,
              default_template_version = $9,
              updated_at = NOW()
          WHERE milestone_id = $1
        `,
        [
          milestoneIdByKey.get(template.key),
          template.degreeLevel,
          template.plans,
          template.title,
          template.description,
          template.references,
          template.sequenceOrder,
          prerequisiteIds,
          defaultMilestoneTemplateVersion,
        ],
      )
    }

    await client.query(
      `
        UPDATE milestone_templates
        SET is_enabled = FALSE,
            updated_at = NOW()
        WHERE default_template_version > 0
          AND default_template_version < $1
          AND academic_year IS NULL
      `,
      [defaultMilestoneTemplateVersion],
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function splitSharedAcademicYearTemplates() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const sharedResult = await client.query(`
      SELECT *
      FROM milestone_templates
      WHERE academic_year IS NOT NULL
        AND cardinality(plans) > 1
        AND NOT ('All' = ANY(plans))
      ORDER BY academic_year, degree_level, sequence_order, created_at
      FOR UPDATE
    `)

    const groups = new Map()
    for (const template of sharedResult.rows) {
      const groupKey = `${template.academic_year}:${template.degree_level}`
      const group = groups.get(groupKey) ?? []
      group.push(template)
      groups.set(groupKey, group)
    }

    for (const templates of groups.values()) {
      const targetIdByPlan = new Map()

      for (const template of templates) {
        const [primaryPlan, ...additionalPlans] = template.plans
        targetIdByPlan.set(`${primaryPlan}:${template.milestone_id}`, template.milestone_id)
        await client.query(
          `UPDATE milestone_templates
           SET plans = ARRAY[$2]::VARCHAR[], updated_at = NOW()
           WHERE milestone_id = $1`,
          [template.milestone_id, primaryPlan],
        )

        for (const plan of additionalPlans) {
          const cloneId = randomUUID()
          const baseKey = template.default_template_key.replace(/^academic-\d+-/, '')
          targetIdByPlan.set(`${plan}:${template.milestone_id}`, cloneId)
          await client.query(
            `
              INSERT INTO milestone_templates (
                milestone_id, default_template_key, default_template_version, academic_year,
                degree_level, semester, plans, prerequisite_milestone_ids, title, description,
                reference_urls, sequence_order, open_date, deadline, first_reminder_date,
                second_reminder_date, is_enabled, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, ARRAY[$7]::VARCHAR[], ARRAY[]::VARCHAR[],
                $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
              )
            `,
            [
              cloneId,
              `academic-${template.academic_year}-${plan}-${baseKey}`,
              template.default_template_version,
              template.academic_year,
              template.degree_level,
              template.semester,
              plan,
              template.title,
              template.description,
              template.reference_urls,
              template.sequence_order,
              template.open_date,
              template.deadline,
              template.first_reminder_date,
              template.second_reminder_date,
              template.is_enabled,
            ],
          )
          await client.query(
            `
              UPDATE student_milestones sm
              SET milestone_id = $2, updated_at = NOW()
              FROM students s
              WHERE sm.student_id = s.student_id
                AND sm.milestone_id = $1
                AND s.education_plan = $3
            `,
            [template.milestone_id, cloneId, plan],
          )
        }
      }

      for (const template of templates) {
        for (const plan of template.plans) {
          const targetId = targetIdByPlan.get(`${plan}:${template.milestone_id}`)
          const prerequisiteIds = template.prerequisite_milestone_ids.map(
            (id) => targetIdByPlan.get(`${plan}:${id}`) ?? id,
          )
          await client.query(
            `UPDATE milestone_templates
             SET prerequisite_milestone_ids = $2, updated_at = NOW()
             WHERE milestone_id = $1`,
            [targetId, prerequisiteIds],
          )
        }
      }

      for (const template of templates) {
        for (const plan of template.plans.slice(1)) {
          const cloneId = targetIdByPlan.get(`${plan}:${template.milestone_id}`)
          await client.query(
            `
              UPDATE milestone_templates
              SET prerequisite_milestone_ids = array_replace(
                    prerequisite_milestone_ids, $1::VARCHAR, $2::VARCHAR
                  ),
                  updated_at = NOW()
              WHERE academic_year = $3
                AND degree_level = $4
                AND plans = ARRAY[$5]::VARCHAR[]
            `,
            [template.milestone_id, cloneId, template.academic_year, template.degree_level, plan],
          )
        }
      }
    }

    const legacyKeys = await client.query(`
      SELECT DISTINCT ON (broken.milestone_id)
        broken.milestone_id,
        broken.academic_year,
        broken.plans[1] AS plan,
        canonical.default_template_key AS canonical_key,
        canonical.plans[1] AS canonical_plan
      FROM milestone_templates broken
      JOIN milestone_templates canonical
        ON canonical.academic_year = broken.academic_year
        AND canonical.degree_level = broken.degree_level
        AND canonical.semester = broken.semester
        AND canonical.title = broken.title
        AND canonical.sequence_order = broken.sequence_order
        AND canonical.default_template_version = broken.default_template_version
        AND canonical.milestone_id <> broken.milestone_id
        AND canonical.default_template_key NOT LIKE 'admin-%'
      WHERE broken.academic_year IS NOT NULL
        AND broken.default_template_key LIKE 'admin-%'
        AND cardinality(broken.plans) = 1
        AND cardinality(canonical.plans) = 1
      ORDER BY broken.milestone_id, canonical.created_at
    `)

    for (const template of legacyKeys.rows) {
      let baseKey = template.canonical_key.replace(/^academic-\d+-/, '')
      if (baseKey.startsWith(`${template.canonical_plan}-`)) {
        baseKey = baseKey.slice(template.canonical_plan.length + 1)
      }
      await client.query(
        `UPDATE milestone_templates
         SET default_template_key = $2, updated_at = NOW()
         WHERE milestone_id = $1`,
        [
          template.milestone_id,
          `academic-${template.academic_year}-${template.plan}-${baseKey}`,
        ],
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function ensureMilestoneSchema() {
  schemaReady ??= pool.query(`
    ALTER TABLE milestone_templates
    ALTER COLUMN degree_level TYPE VARCHAR USING degree_level::text
  `)
    .then(() => pool.query(`
    ALTER TABLE milestone_templates
    ADD COLUMN IF NOT EXISTS semester VARCHAR NOT NULL DEFAULT '1'
  `))
    .then(() => pool.query(`
      ALTER TABLE milestone_templates
      ADD COLUMN IF NOT EXISTS plans VARCHAR[] NOT NULL DEFAULT ARRAY['All']::VARCHAR[]
    `))
    .then(() => pool.query(`
      ALTER TABLE milestone_templates
      ADD COLUMN IF NOT EXISTS prerequisite_milestone_ids VARCHAR[] NOT NULL DEFAULT ARRAY[]::VARCHAR[]
    `))
    .then(() => pool.query(`
      ALTER TABLE milestone_templates
      ADD COLUMN IF NOT EXISTS reference_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
    `))
    .then(() => pool.query(`
      ALTER TABLE milestone_templates
      ADD COLUMN IF NOT EXISTS default_template_key VARCHAR UNIQUE
    `))
    .then(() => pool.query(`
      ALTER TABLE milestone_templates
      ADD COLUMN IF NOT EXISTS default_template_version INT NOT NULL DEFAULT 0
    `))
    .then(() => pool.query(`
      ALTER TABLE milestone_templates
      ADD COLUMN IF NOT EXISTS academic_year INT
    `))
    .then(() => pool.query(`
      CREATE INDEX IF NOT EXISTS milestone_templates_academic_year_idx
      ON milestone_templates (academic_year)
    `))
    .then(() => pool.query(`
      ALTER TABLE milestone_templates
      ALTER COLUMN open_date DROP NOT NULL,
      ALTER COLUMN deadline DROP NOT NULL
    `))
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
    .then(() => seedDefaultMilestoneTemplates())
    .then(() => splitSharedAcademicYearTemplates())
    .then(() => pool.query(`
      UPDATE milestone_templates
      SET prerequisite_milestone_ids = ARRAY[]::VARCHAR[],
          updated_at = NOW()
      WHERE academic_year IS NOT NULL
        AND default_template_key LIKE 'academic-%'
        AND default_template_version < ${defaultMilestoneTemplateVersion}
    `))
    .then(() => pool.query(`
      UPDATE milestone_templates
      SET is_enabled = TRUE,
          default_template_version = ${defaultMilestoneTemplateVersion},
          updated_at = NOW()
      WHERE academic_year IS NOT NULL
        AND default_template_key LIKE 'academic-%'
        AND default_template_version < ${defaultMilestoneTemplateVersion}
    `))
  await schemaReady
}

export async function findMilestones({ degreeLevel, semester, academicYear } = {}) {
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

  if (academicYear) {
    values.push(academicYear)
    conditions.push(`academic_year = $${values.length}`)
  }

  conditions.push('default_template_key IS NOT NULL')
  conditions.push('academic_year IS NOT NULL')
  const filter = `WHERE ${conditions.join(' AND ')}`

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
        mt.default_template_key AS "templateKey",
        mt.degree_level AS "degreeLevel",
        mt.semester,
        mt.plans,
        mt.prerequisite_milestone_ids AS "prerequisiteMilestoneIds",
        ARRAY(
          SELECT prerequisite_template.title
          FROM unnest(mt.prerequisite_milestone_ids) WITH ORDINALITY AS prerequisite(milestone_id, position)
          JOIN milestone_templates prerequisite_template
            ON prerequisite_template.milestone_id::text = prerequisite.milestone_id
          ORDER BY prerequisite.position
        ) AS "prerequisiteTitles",
        mt.title,
        mt.description,
        mt.reference_urls AS references,
        mt.sequence_order AS "sequenceOrder",
        mt.open_date AS "openDate",
        mt.deadline,
        mt.first_reminder_date AS "firstReminderDate",
        mt.second_reminder_date AS "secondReminderDate",
        (
          (mt.semester <> 'all' AND mt.semester::int > s.semester::int)
          OR mt.open_date > CURRENT_DATE
          OR EXISTS (
            SELECT 1
            FROM unnest(mt.prerequisite_milestone_ids) AS prerequisite(milestone_id)
            LEFT JOIN student_milestones prerequisite_status
              ON prerequisite_status.student_id = s.student_id
              AND prerequisite_status.milestone_id::text = prerequisite.milestone_id
              AND prerequisite_status.status IN ('Completed', 'Approved')
            WHERE prerequisite_status.student_milestone_id IS NULL
          )
        ) AS "isLocked",
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
        ON (mt.degree_level = s.degree_level::text OR mt.degree_level = 'All')
        AND mt.academic_year = s.enrollment_academic_year
        AND (mt.plans @> ARRAY['All']::VARCHAR[] OR s.education_plan IS NULL OR s.education_plan = ANY(mt.plans))
        AND mt.is_enabled = TRUE
      LEFT JOIN student_milestones sm
        ON sm.student_id = s.student_id
        AND sm.milestone_id = mt.milestone_id
      WHERE s.user_id = $1
      ORDER BY CASE WHEN mt.semester = 'all' THEN 0 ELSE mt.semester::int END, mt.sequence_order, mt.created_at
    `,
    [userId],
  )

  return result.rows
}

export async function studentMilestoneRequiresAdvisor(userId, milestoneId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT target.sequence_order > appointment.sequence_order AS "requiresAdvisor"
      FROM students s
      JOIN milestone_templates target
        ON target.milestone_id = $2
        AND target.academic_year = s.enrollment_academic_year
        AND target.degree_level = s.degree_level::text
        AND s.education_plan = ANY(target.plans)
      JOIN milestone_templates appointment
        ON appointment.academic_year = s.enrollment_academic_year
        AND appointment.degree_level = s.degree_level::text
        AND s.education_plan = ANY(appointment.plans)
        AND appointment.default_template_key LIKE '%advisor-appointment'
      WHERE s.user_id = $1
      LIMIT 1
    `,
    [userId, milestoneId],
  )

  return result.rows[0]?.requiresAdvisor ?? false
}

export async function areStudentMilestonePrerequisitesComplete(userId, milestoneId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT NOT EXISTS (
        SELECT 1
        FROM unnest(mt.prerequisite_milestone_ids) AS prerequisite(milestone_id)
        LEFT JOIN student_milestones prerequisite_status
          ON prerequisite_status.student_id = s.student_id
          AND prerequisite_status.milestone_id::text = prerequisite.milestone_id
          AND prerequisite_status.status IN ('Completed', 'Approved')
        WHERE prerequisite_status.student_milestone_id IS NULL
      ) AS complete
      FROM students s
      JOIN milestone_templates mt ON mt.milestone_id = $2
      WHERE s.user_id = $1
      LIMIT 1
    `,
    [userId, milestoneId],
  )

  return result.rows[0]?.complete ?? true
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
        mt.plans,
        mt.prerequisite_milestone_ids AS "prerequisiteMilestoneIds",
        mt.title,
        mt.description,
        mt.reference_urls AS references,
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
        ON (mt.degree_level = s.degree_level::text OR mt.degree_level = 'All')
        AND mt.academic_year = s.enrollment_academic_year
        AND (mt.plans @> ARRAY['All']::VARCHAR[] OR s.education_plan IS NULL OR s.education_plan = ANY(mt.plans))
        AND mt.is_enabled = TRUE
      LEFT JOIN student_milestones sm
        ON sm.student_id = s.student_id
        AND sm.milestone_id = mt.milestone_id
      WHERE s.student_id = $1
      ORDER BY CASE WHEN mt.semester = 'all' THEN 0 ELSE mt.semester::int END, mt.sequence_order, mt.created_at
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
        (s.advisor_id = a.advisor_id) AS "canReview",
        mt.milestone_id AS "milestoneId",
        mt.degree_level AS "degreeLevel",
        mt.semester,
        mt.plans,
        mt.prerequisite_milestone_ids AS "prerequisiteMilestoneIds",
        mt.title,
        mt.description,
        mt.reference_urls AS references,
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
        ON s.student_id = $2
      LEFT JOIN milestone_templates mt
        ON (mt.degree_level = s.degree_level::text OR mt.degree_level = 'All')
        AND mt.academic_year = s.enrollment_academic_year
        AND (mt.plans @> ARRAY['All']::VARCHAR[] OR s.education_plan IS NULL OR s.education_plan = ANY(mt.plans))
        AND mt.is_enabled = TRUE
      LEFT JOIN student_milestones sm
        ON sm.student_id = s.student_id
        AND sm.milestone_id = mt.milestone_id
      WHERE a.user_id = $1
        AND (
          s.advisor_id = a.advisor_id
          OR EXISTS (
            SELECT 1
            FROM student_co_advisors sca
            WHERE sca.student_id = s.student_id
              AND sca.advisor_id = a.advisor_id
          )
        )
      ORDER BY CASE WHEN mt.semester = 'all' THEN 0 ELSE mt.semester::int END, mt.sequence_order, mt.created_at
    `,
    [advisorUserId, studentId],
  )

  if (!result.rows.length) return null

  return {
    canReview: result.rows[0].canReview,
    student: {
      studentId: result.rows[0].studentId,
      studentName: result.rows[0].studentName,
    },
    milestones: result.rows
      .filter((row) => row.milestoneId)
      .map(
        ({ studentId: _studentId, studentName: _studentName, canReview: _canReview, ...milestone }) =>
          milestone,
      ),
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
        AND mt.academic_year = s.enrollment_academic_year
        AND (mt.degree_level = s.degree_level::text OR mt.degree_level = 'All')
        AND (mt.plans @> ARRAY['All']::VARCHAR[] OR s.education_plan IS NULL OR s.education_plan = ANY(mt.plans))
        AND mt.is_enabled = TRUE
        AND (mt.semester = 'all' OR mt.semester::int <= s.semester::int)
        AND (mt.open_date IS NULL OR mt.open_date <= CURRENT_DATE)
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

export async function nextSequenceOrder(degreeLevel, semester = '1', plans = null, academicYear = null) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT COALESCE(MAX(sequence_order), 0) + 1 AS "nextOrder"
      FROM milestone_templates
      WHERE degree_level = $1
        AND semester = $2
        AND ($3::VARCHAR[] IS NULL OR plans = $3)
        AND ($4::INT IS NULL OR academic_year = $4)
        AND default_template_key IS NOT NULL
    `,
    [degreeLevel, semester, plans, academicYear],
  )

  return result.rows[0].nextOrder
}

export async function createMilestone(input) {
  await ensureMilestoneSchema()

  const milestoneId = randomUUID()
  const sequenceOrder =
    input.sequenceOrder ||
    (await nextSequenceOrder(input.degreeLevel, input.semester, input.plans, input.academicYear))

  await pool.query(
    `
      INSERT INTO milestone_templates (
        milestone_id, default_template_key, academic_year, degree_level, semester, plans, prerequisite_milestone_ids,
        title, description, reference_urls, sequence_order, open_date, deadline,
        first_reminder_date, second_reminder_date, is_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `,
    [
      milestoneId,
      `admin-${milestoneId}`,
      input.academicYear,
      input.degreeLevel,
      input.semester,
      input.plans,
      input.prerequisiteMilestoneIds,
      input.title,
      input.description,
      input.references,
      sequenceOrder,
      input.openDate,
      input.deadline,
      input.firstReminderDate,
      input.secondReminderDate,
      input.isEnabled,
    ],
  )

  const milestone = await findMilestoneById(milestoneId)
  await createMilestoneReminderNotification(milestone, 'created')

  return milestone
}

function normalizeDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function createDueMilestoneReminderNotifications(date = null) {
  await ensureMilestoneSchema()

  const targetDate = normalizeDate(date) ?? normalizeDate(new Date())
  const result = await pool.query(
    `
      SELECT ${milestoneColumns}
      FROM milestone_templates
      WHERE is_enabled = TRUE
        AND (
          first_reminder_date = $1::date
          OR second_reminder_date = $1::date
        )
      ORDER BY degree_level, semester, sequence_order, created_at
    `,
    [targetDate],
  )

  const notifications = []

  for (const milestone of result.rows) {
    if (normalizeDate(milestone.firstReminderDate) === targetDate) {
      const notification = await createMilestoneReminderNotification(milestone, 'first')
      if (notification) notifications.push(notification)
    }

    if (normalizeDate(milestone.secondReminderDate) === targetDate) {
      const notification = await createMilestoneReminderNotification(milestone, 'second')
      if (notification) notifications.push(notification)
    }
  }

  return notifications
}

export async function updateMilestone(milestoneId, input) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      UPDATE milestone_templates
      SET
        academic_year = $2,
        degree_level = $3,
        semester = $4,
        plans = $5,
        prerequisite_milestone_ids = $6,
        title = $7,
        description = $8,
        reference_urls = $9,
        sequence_order = $10,
        open_date = $11,
        deadline = $12,
        first_reminder_date = $13,
        second_reminder_date = $14,
        is_enabled = $15,
        updated_at = NOW()
      WHERE milestone_id = $1
    `,
    [
      milestoneId,
      input.academicYear,
      input.degreeLevel,
      input.semester,
      input.plans,
      input.prerequisiteMilestoneIds,
      input.title,
      input.description,
      input.references,
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

export async function updateMilestoneForPlan(milestoneId, scopePlan, input) {
  await ensureMilestoneSchema()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const currentResult = await client.query(
      'SELECT * FROM milestone_templates WHERE milestone_id = $1 FOR UPDATE',
      [milestoneId],
    )
    const current = currentResult.rows[0]
    if (!current) {
      await client.query('ROLLBACK')
      return null
    }

    let targetMilestoneId = milestoneId
    let targetPrerequisiteIds = input.prerequisiteMilestoneIds
    if (current.plans.includes(scopePlan) && current.plans.length > 1) {
      const sharedTemplates = await client.query(
        `
          SELECT *
          FROM milestone_templates
          WHERE academic_year IS NOT DISTINCT FROM $1
            AND degree_level = $2
            AND $3 = ANY(plans)
            AND cardinality(plans) > 1
          ORDER BY sequence_order, created_at
          FOR UPDATE
        `,
        [current.academic_year, current.degree_level, scopePlan],
      )
      const clonedIdByOriginalId = new Map(
        sharedTemplates.rows.map((template) => [template.milestone_id, randomUUID()]),
      )

      for (const template of sharedTemplates.rows) {
        const cloneId = clonedIdByOriginalId.get(template.milestone_id)
        const clonedPrerequisites = template.prerequisite_milestone_ids.map(
          (id) => clonedIdByOriginalId.get(id) ?? id,
        )
        await client.query(
          `
            INSERT INTO milestone_templates (
              milestone_id, default_template_key, default_template_version, academic_year,
              degree_level, semester, plans, prerequisite_milestone_ids, title, description,
              reference_urls, sequence_order, open_date, deadline, first_reminder_date,
              second_reminder_date, is_enabled, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, ARRAY[$7]::VARCHAR[], $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
            )
          `,
          [
            cloneId,
            `admin-${cloneId}`,
            template.default_template_version,
            template.academic_year,
            template.degree_level,
            template.semester,
            scopePlan,
            clonedPrerequisites,
            template.title,
            template.description,
            template.reference_urls,
            template.sequence_order,
            template.open_date,
            template.deadline,
            template.first_reminder_date,
            template.second_reminder_date,
            template.is_enabled,
          ],
        )
        await client.query(
          'UPDATE milestone_templates SET plans = array_remove(plans, $2), updated_at = NOW() WHERE milestone_id = $1',
          [template.milestone_id, scopePlan],
        )
        await client.query(
          `
            UPDATE student_milestones sm
            SET milestone_id = $2, updated_at = NOW()
            FROM students s
            WHERE sm.student_id = s.student_id
              AND sm.milestone_id = $1
              AND s.education_plan = $3
          `,
          [template.milestone_id, cloneId, scopePlan],
        )
      }
      for (const [originalId, cloneId] of clonedIdByOriginalId) {
        await client.query(
          `
            UPDATE milestone_templates
            SET prerequisite_milestone_ids = array_replace(
                  prerequisite_milestone_ids, $1::VARCHAR, $2::VARCHAR
                ),
                updated_at = NOW()
            WHERE academic_year IS NOT DISTINCT FROM $3
              AND degree_level = $4
              AND $5 = ANY(plans)
          `,
          [originalId, cloneId, current.academic_year, current.degree_level, scopePlan],
        )
      }
      targetMilestoneId = clonedIdByOriginalId.get(milestoneId)
      targetPrerequisiteIds = input.prerequisiteMilestoneIds.map(
        (id) => clonedIdByOriginalId.get(id) ?? id,
      )
    }

    const updated = await client.query(
      `
        UPDATE milestone_templates
        SET academic_year = $2, degree_level = $3, semester = $4,
            plans = ARRAY[$5]::VARCHAR[], prerequisite_milestone_ids = $6,
            title = $7, description = $8, reference_urls = $9,
            sequence_order = $10, open_date = $11, deadline = $12,
            first_reminder_date = $13, second_reminder_date = $14,
            is_enabled = $15, updated_at = NOW()
        WHERE milestone_id = $1
      `,
      [
        targetMilestoneId, input.academicYear, input.degreeLevel, input.semester, scopePlan,
        targetPrerequisiteIds, input.title, input.description, input.references,
        input.sequenceOrder, input.openDate, input.deadline, input.firstReminderDate,
        input.secondReminderDate, input.isEnabled,
      ],
    )
    if (!updated.rowCount) {
      await client.query('ROLLBACK')
      return null
    }
    await client.query('COMMIT')
    return findMilestoneById(targetMilestoneId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function removeMilestone(milestoneId) {
  await ensureMilestoneSchema()

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const current = await client.query(
      'SELECT academic_year, degree_level, semester, plans FROM milestone_templates WHERE milestone_id = $1 FOR UPDATE',
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
          WHERE degree_level = $1
            AND semester = $2
            AND plans = $3
            AND academic_year = $4
            AND default_template_key IS NOT NULL
        )
        UPDATE milestone_templates mt
        SET sequence_order = ordered_milestones.next_order,
            updated_at = NOW()
        FROM ordered_milestones
        WHERE mt.milestone_id = ordered_milestones.milestone_id
          AND mt.sequence_order <> ordered_milestones.next_order
      `,
      [milestone.degree_level, milestone.semester, milestone.plans, milestone.academic_year],
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
      'SELECT milestone_id, academic_year, degree_level, semester, plans, sequence_order FROM milestone_templates WHERE milestone_id = $1 FOR UPDATE',
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
        WHERE degree_level = $1
          AND semester = $2
          AND plans && $4::VARCHAR[]
          AND academic_year IS NOT DISTINCT FROM $5
          AND default_template_key IS NOT NULL
          AND sequence_order ${operator} $3
        ORDER BY sequence_order ${order}
        LIMIT 1
        FOR UPDATE
      `,
      [
        milestone.degree_level,
        milestone.semester,
        milestone.sequence_order,
        milestone.plans,
        milestone.academic_year,
      ],
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
        SELECT milestone_id, title, description, reference_urls, sequence_order, open_date, deadline,
          first_reminder_date, second_reminder_date, is_enabled, prerequisite_milestone_ids
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
        WHERE degree_level = $1
          AND semester = $2
          AND default_template_key IS NOT NULL
        FOR UPDATE
      `,
      [toDegreeLevel, toSemester],
    )

    const orderResult = await client.query(
      `
        SELECT COALESCE(MAX(sequence_order), 0) AS "maxOrder"
        FROM milestone_templates
        WHERE degree_level = $1
          AND semester = $2
          AND default_template_key IS NOT NULL
      `,
      [toDegreeLevel, toSemester],
    )
    let nextOrder = Number(orderResult.rows[0].maxOrder) + 1
    const copiedMilestones = []
    const copiedIdBySourceId = new Map(
      source.rows.map((row) => [row.milestone_id, randomUUID()]),
    )

    for (const row of source.rows) {
      const milestoneId = copiedIdBySourceId.get(row.milestone_id)
      const copiedMilestone = {
        milestoneId,
        degreeLevel: toDegreeLevel,
        semester: toSemester,
        plans: ['All'],
        prerequisiteMilestoneIds: row.prerequisite_milestone_ids
          .map((prerequisiteId) => copiedIdBySourceId.get(prerequisiteId))
          .filter(Boolean),
        title: row.title,
        description: row.description,
        references: row.reference_urls,
        sequenceOrder: nextOrder,
        openDate: shiftDateToYear(row.open_date, toYear),
        deadline: shiftDateToYear(row.deadline, toYear),
        firstReminderDate: shiftDateToYear(row.first_reminder_date, toYear),
        secondReminderDate: shiftDateToYear(row.second_reminder_date, toYear),
        isEnabled: row.is_enabled,
      }

      await client.query(
        `
          INSERT INTO milestone_templates (
            milestone_id, default_template_key, degree_level, semester, plans, prerequisite_milestone_ids,
            title, description, reference_urls, sequence_order, open_date, deadline,
            first_reminder_date, second_reminder_date, is_enabled
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `,
        [
          copiedMilestone.milestoneId,
          `copy-${copiedMilestone.milestoneId}`,
          copiedMilestone.degreeLevel,
          copiedMilestone.semester,
          copiedMilestone.plans,
          copiedMilestone.prerequisiteMilestoneIds,
          copiedMilestone.title,
          copiedMilestone.description,
          copiedMilestone.references,
          copiedMilestone.sequenceOrder,
          copiedMilestone.openDate,
          copiedMilestone.deadline,
          copiedMilestone.firstReminderDate,
          copiedMilestone.secondReminderDate,
          copiedMilestone.isEnabled,
        ],
      )
      copiedMilestones.push(copiedMilestone)
      nextOrder += 1
    }

    await client.query('COMMIT')

    for (const milestone of copiedMilestones) {
      await createMilestoneReminderNotification(milestone, 'created')
    }

    return source.rowCount
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
