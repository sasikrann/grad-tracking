import { randomUUID } from 'node:crypto'

import pool from '../config/database.js'
import { defaultMilestoneTemplates } from '../data/default-milestone-templates.js'
import { createEvidenceCode } from './evidence-code.js'
import { defaultMilestoneTemplateVersion } from './milestone.constants.js'
import { createMilestoneReminderNotification } from './milestone-notification.service.js'

let schemaReady

const milestoneColumns = `
  milestone_id AS "milestoneId",
  academic_year AS "academicYear",
  degree_level AS "degreeLevel",
  semester,
  plans,
  prerequisite_milestone_ids AS "prerequisiteMilestoneIds",
  evidence_code AS "evidenceCode",
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
                prerequisite_milestone_ids, evidence_code, title, description, reference_urls,
                sequence_order, open_date, deadline, first_reminder_date,
                second_reminder_date, is_enabled, default_template_version
              )
              VALUES ($1, $2, $3, 'all', $4, ARRAY[]::VARCHAR[], $5, $6, $7,
                $8, $9, NULL, NULL, NULL, NULL, TRUE, $10)
            `,
            [
              milestoneId,
              template.key,
              template.degreeLevel,
              template.plans,
              template.evidenceCode,
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
              evidence_code = $9,
              default_template_version = $10,
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
          template.evidenceCode,
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
                degree_level, semester, plans, prerequisite_milestone_ids, evidence_code, title, description,
                reference_urls, sequence_order, open_date, deadline, first_reminder_date,
                second_reminder_date, is_enabled, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, ARRAY[$7]::VARCHAR[], ARRAY[]::VARCHAR[],
                $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
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
              template.evidence_code,
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

async function backfillMilestoneEvidenceCodes() {
  const result = await pool.query(`
    SELECT milestone_id, default_template_key, title, sequence_order
    FROM milestone_templates
    WHERE evidence_code IS NULL OR BTRIM(evidence_code) = ''
  `)

  for (const milestone of result.rows) {
    const evidenceCode = createEvidenceCode({
      title: milestone.title,
      templateKey: milestone.default_template_key,
      sequenceOrder: milestone.sequence_order,
    })
    await pool.query(
      'UPDATE milestone_templates SET evidence_code = $2 WHERE milestone_id = $1',
      [milestone.milestone_id, evidenceCode],
    )
  }

  await pool.query(`
    ALTER TABLE milestone_templates
    ALTER COLUMN evidence_code SET NOT NULL
  `)
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
      ADD COLUMN IF NOT EXISTS evidence_code VARCHAR(24)
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
      ALTER TABLE students
      ADD COLUMN IF NOT EXISTS student_status VARCHAR NOT NULL DEFAULT 'Normal'
    `))
    .then(() => pool.query(`
      UPDATE students
      SET student_status = 'Graduate'
      WHERE graduation_semester IS NOT NULL
        AND graduation_academic_year IS NOT NULL
        AND student_status <> 'Graduate'
    `))
    .then(() => pool.query(`
      ALTER TABLE student_milestones
      ADD CONSTRAINT student_milestones_student_milestone_unique UNIQUE (student_id, milestone_id)
    `)
    .catch((error) => {
      if (!['42710', '42P07'].includes(error.code)) throw error
    }))
    .then(() => seedDefaultMilestoneTemplates())
    .then(() => backfillMilestoneEvidenceCodes())
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

async function assertEvidenceCodeAvailable(
  database,
  { evidenceCode, academicYear, degreeLevel, plans, excludeMilestoneId = null },
) {
  const result = await database.query(
    `
      SELECT 1
      FROM milestone_templates
      WHERE evidence_code = $1
        AND academic_year IS NOT DISTINCT FROM $2
        AND (degree_level = $3 OR degree_level = 'All' OR $3 = 'All')
        AND (
          plans @> ARRAY['All']::VARCHAR[]
          OR $4::VARCHAR[] @> ARRAY['All']::VARCHAR[]
          OR plans && $4::VARCHAR[]
        )
        AND ($5::UUID IS NULL OR milestone_id <> $5)
      LIMIT 1
    `,
    [evidenceCode, academicYear, degreeLevel, plans, excludeMilestoneId],
  )
  if (result.rowCount) {
    const error = new Error('Evidence Code is already used by another milestone in this plan')
    error.statusCode = 409
    throw error
  }
}

export async function createMilestone(input) {
  await ensureMilestoneSchema()

  const milestoneId = randomUUID()
  const sequenceOrder =
    input.sequenceOrder ||
    (await nextSequenceOrder(input.degreeLevel, input.semester, input.plans, input.academicYear))
  const evidenceCode = createEvidenceCode({
    value: input.evidenceCode,
    title: input.title,
    sequenceOrder,
  })
  await assertEvidenceCodeAvailable(pool, {
    evidenceCode,
    academicYear: input.academicYear,
    degreeLevel: input.degreeLevel,
    plans: input.plans,
  })

  await pool.query(
    `
      INSERT INTO milestone_templates (
        milestone_id, default_template_key, academic_year, degree_level, semester, plans, prerequisite_milestone_ids,
        evidence_code, title, description, reference_urls, sequence_order, open_date, deadline,
        first_reminder_date, second_reminder_date, is_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `,
    [
      milestoneId,
      `admin-${milestoneId}`,
      input.academicYear,
      input.degreeLevel,
      input.semester,
      input.plans,
      input.prerequisiteMilestoneIds,
      evidenceCode,
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

export async function updateMilestone(milestoneId, input) {
  await ensureMilestoneSchema()
  const evidenceCode = createEvidenceCode({
    value: input.evidenceCode,
    title: input.title,
    sequenceOrder: input.sequenceOrder,
  })
  await assertEvidenceCodeAvailable(pool, {
    evidenceCode,
    academicYear: input.academicYear,
    degreeLevel: input.degreeLevel,
    plans: input.plans,
    excludeMilestoneId: milestoneId,
  })

  const result = await pool.query(
    `
      UPDATE milestone_templates
      SET
        academic_year = $2,
        degree_level = $3,
        semester = $4,
        plans = $5,
        prerequisite_milestone_ids = $6,
        evidence_code = $7,
        title = $8,
        description = $9,
        reference_urls = $10,
        sequence_order = $11,
        open_date = $12,
        deadline = $13,
        first_reminder_date = $14,
        second_reminder_date = $15,
        is_enabled = $16,
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
      evidenceCode,
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
              degree_level, semester, plans, prerequisite_milestone_ids, evidence_code, title, description,
              reference_urls, sequence_order, open_date, deadline, first_reminder_date,
              second_reminder_date, is_enabled, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, ARRAY[$7]::VARCHAR[], $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
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
            template.evidence_code,
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

    const evidenceCode = createEvidenceCode({
      value: input.evidenceCode,
      title: input.title,
      sequenceOrder: input.sequenceOrder,
    })
    await assertEvidenceCodeAvailable(client, {
      evidenceCode,
      academicYear: input.academicYear,
      degreeLevel: input.degreeLevel,
      plans: [scopePlan],
      excludeMilestoneId: targetMilestoneId,
    })

    const updated = await client.query(
      `
        UPDATE milestone_templates
        SET academic_year = $2, degree_level = $3, semester = $4,
            plans = ARRAY[$5]::VARCHAR[], prerequisite_milestone_ids = $6,
            evidence_code = $7, title = $8, description = $9, reference_urls = $10,
            sequence_order = $11, open_date = $12, deadline = $13,
            first_reminder_date = $14, second_reminder_date = $15,
            is_enabled = $16, updated_at = NOW()
        WHERE milestone_id = $1
      `,
      [
        targetMilestoneId, input.academicYear, input.degreeLevel, input.semester, scopePlan,
        targetPrerequisiteIds,
        evidenceCode,
        input.title, input.description, input.references,
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
        SELECT milestone_id, evidence_code, title, description, reference_urls, sequence_order, open_date, deadline,
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
        evidenceCode: row.evidence_code,
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
            evidence_code, title, description, reference_urls, sequence_order, open_date, deadline,
            first_reminder_date, second_reminder_date, is_enabled
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `,
        [
          copiedMilestone.milestoneId,
          `copy-${copiedMilestone.milestoneId}`,
          copiedMilestone.degreeLevel,
          copiedMilestone.semester,
          copiedMilestone.plans,
          copiedMilestone.prerequisiteMilestoneIds,
          copiedMilestone.evidenceCode,
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
