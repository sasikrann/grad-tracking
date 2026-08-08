import { randomUUID } from 'node:crypto'

import { defaultMilestoneTemplateVersion } from './milestone.constants.js'

export async function ensureAcademicYearMilestoneTemplates(client, academicYear) {
  const year = Number(academicYear)
  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    throw new Error('academicYear must be between 2000 and 2200')
  }

  const existing = await client.query(
    'SELECT 1 FROM milestone_templates WHERE academic_year = $1 LIMIT 1',
    [year],
  )
  if (existing.rowCount) return false

  const latestYearResult = await client.query(
    `SELECT MAX(academic_year) AS academic_year
     FROM milestone_templates
     WHERE academic_year < $1`,
    [year],
  )
  const sourceYear = latestYearResult.rows[0].academic_year
  const source = await client.query(
    `
      SELECT milestone_id, default_template_key, degree_level, semester, plans,
        prerequisite_milestone_ids, title, description, reference_urls, sequence_order, is_enabled
      FROM milestone_templates
      WHERE academic_year ${sourceYear ? '= $1' : 'IS NULL'}
        ${sourceYear ? '' : `AND default_template_version = ${defaultMilestoneTemplateVersion}`}
      ORDER BY degree_level, plans::text, sequence_order, created_at
    `,
    sourceYear ? [sourceYear] : [],
  )

  const copiedIdBySourceId = new Map(
    source.rows.map((template) => [template.milestone_id, randomUUID()]),
  )

  for (const template of source.rows) {
    const baseKey = template.default_template_key.replace(/^academic-\d+-/, '')
    await client.query(
      `
        INSERT INTO milestone_templates (
          milestone_id, default_template_key, default_template_version, academic_year,
          degree_level, semester, plans, prerequisite_milestone_ids, title, description,
          reference_urls, sequence_order, open_date, deadline, first_reminder_date,
          second_reminder_date, is_enabled
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, ARRAY[]::VARCHAR[], $8, $9, $10, $11,
          NULL, NULL, NULL, NULL, $12)
      `,
      [
        copiedIdBySourceId.get(template.milestone_id),
        `academic-${year}-${baseKey}`,
        defaultMilestoneTemplateVersion,
        year,
        template.degree_level,
        template.semester,
        template.plans,
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
