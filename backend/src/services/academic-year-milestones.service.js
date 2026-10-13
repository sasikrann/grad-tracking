import { randomUUID } from 'node:crypto'

import { defaultMilestoneTemplateVersion } from './milestone.constants.js'

async function findRequiredScopes(client, academicYear) {
  const result = await client.query(
    `SELECT DISTINCT degree_level::text AS "degreeLevel", education_plan AS "educationPlan"
     FROM students
     WHERE enrollment_academic_year = $1
       AND education_plan IS NOT NULL
     ORDER BY degree_level::text, education_plan`,
    [academicYear],
  )
  return result.rows
}

async function findSourceTemplates(client, academicYear, degreeLevel, educationPlan) {
  const sourceYearResult = await client.query(
    `SELECT MAX(academic_year) AS "academicYear"
     FROM milestone_templates
     WHERE academic_year < $1
       AND degree_level = $2
       AND $3 = ANY(plans)`,
    [academicYear, degreeLevel, educationPlan],
  )
  const sourceYear = sourceYearResult.rows[0]?.academicYear ?? null

  return client.query(
    `SELECT milestone_id, default_template_key, degree_level, semester,
       prerequisite_milestone_ids, evidence_code, title, description, reference_urls,
       sequence_order, is_enabled
     FROM milestone_templates
     WHERE ${sourceYear === null ? 'academic_year IS NULL' : 'academic_year = $1'}
       AND degree_level = $${sourceYear === null ? 1 : 2}
       AND $${sourceYear === null ? 2 : 3} = ANY(plans)
       ${sourceYear === null ? `AND default_template_version = ${defaultMilestoneTemplateVersion}` : ''}
     ORDER BY sequence_order, created_at`,
    sourceYear === null
      ? [degreeLevel, educationPlan]
      : [sourceYear, degreeLevel, educationPlan],
  )
}

async function copyScope(client, academicYear, degreeLevel, educationPlan) {
  const existing = await client.query(
    `SELECT 1
     FROM milestone_templates
     WHERE academic_year = $1
       AND degree_level = $2
       AND $3 = ANY(plans)
     LIMIT 1`,
    [academicYear, degreeLevel, educationPlan],
  )
  if (existing.rowCount) return false

  const source = await findSourceTemplates(client, academicYear, degreeLevel, educationPlan)
  if (!source.rowCount) return false

  const copiedIdBySourceId = new Map(
    source.rows.map((template) => [template.milestone_id, randomUUID()]),
  )

  for (const template of source.rows) {
    const escapedPlan = educationPlan.replace('.', '\\.')
    const baseKey = template.default_template_key
      .replace(/^academic-\d+-/, '')
      .replace(new RegExp(`^${escapedPlan}-`), '')
    await client.query(
      `INSERT INTO milestone_templates (
        milestone_id, default_template_key, default_template_version, academic_year,
        degree_level, semester, plans, prerequisite_milestone_ids, evidence_code, title,
        description, reference_urls, sequence_order, open_date, deadline,
        first_reminder_date, second_reminder_date, is_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, ARRAY[$7]::VARCHAR[], ARRAY[]::VARCHAR[],
        $8, $9, $10, $11, $12, NULL, NULL, NULL, NULL, $13)`,
      [
        copiedIdBySourceId.get(template.milestone_id),
        `academic-${academicYear}-${educationPlan}-${baseKey}`,
        defaultMilestoneTemplateVersion,
        academicYear,
        degreeLevel,
        template.semester,
        educationPlan,
        template.evidence_code,
        template.title,
        template.description,
        template.reference_urls,
        template.sequence_order,
        template.is_enabled,
      ],
    )
  }

  for (const template of source.rows) {
    const prerequisiteIds = template.prerequisite_milestone_ids
      .map((id) => copiedIdBySourceId.get(id))
      .filter(Boolean)
    await client.query(
      'UPDATE milestone_templates SET prerequisite_milestone_ids = $2 WHERE milestone_id = $1',
      [copiedIdBySourceId.get(template.milestone_id), prerequisiteIds],
    )
  }

  return true
}

// Creates each missing degree-and-plan milestone set from the latest year of that same plan.
export async function ensureAcademicYearMilestoneTemplates(client, academicYear) {
  const year = Number(academicYear)
  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    throw new Error('academicYear must be between 2000 and 2200')
  }

  const scopes = await findRequiredScopes(client, year)
  let copiedScopes = 0
  for (const { degreeLevel, educationPlan } of scopes) {
    if (await copyScope(client, year, degreeLevel, educationPlan)) copiedScopes += 1
  }
  return copiedScopes > 0
}
