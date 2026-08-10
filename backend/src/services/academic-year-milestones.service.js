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

  const copies = source.rows.flatMap((template) => {
    const plans = template.plans.length > 1 && !template.plans.includes('All')
      ? template.plans
      : [template.plans[0]]

    return plans.map((plan) => ({
      source: template,
      plan,
      milestoneId: randomUUID(),
    }))
  })
  const copiedIdByPlanAndSourceId = new Map(
    copies.map(({ source: template, plan, milestoneId }) => [
      `${plan}:${template.milestone_id}`,
      milestoneId,
    ]),
  )

  for (const { source: template, plan, milestoneId } of copies) {
    const baseKey = template.default_template_key.replace(/^academic-\d+-/, '')
    const planKey = template.plans.length > 1 && !template.plans.includes('All')
      ? `${plan}-`
      : ''
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
        milestoneId,
        `academic-${year}-${planKey}${baseKey}`,
        defaultMilestoneTemplateVersion,
        year,
        template.degree_level,
        template.semester,
        [plan],
        template.title,
        template.description,
        template.reference_urls,
        template.sequence_order,
        template.is_enabled,
      ],
    )
  }

  for (const { source: template, plan, milestoneId } of copies) {
    const prerequisiteIds = template.prerequisite_milestone_ids
      .map((id) => copiedIdByPlanAndSourceId.get(`${plan}:${id}`))
      .filter(Boolean)
    await client.query(
      'UPDATE milestone_templates SET prerequisite_milestone_ids = $2 WHERE milestone_id = $1',
      [milestoneId, prerequisiteIds],
    )
  }

  return true
}
