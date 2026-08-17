import assert from 'node:assert/strict'
import test from 'node:test'

import { defaultMilestoneTemplates } from './default-milestone-templates.js'

function templatesFor(degreeLevel, plan) {
  return defaultMilestoneTemplates
    .filter(
      (template) =>
        (template.degreeLevel === 'All' || template.degreeLevel === degreeLevel) &&
        template.plans.includes(plan),
    )
    .sort((first, second) => first.sequenceOrder - second.sequenceOrder)
}

test('defines three plan-specific template sets', () => {
  assert.equal(defaultMilestoneTemplates.length, 35)
  assert.equal(new Set(defaultMilestoneTemplates.map((template) => template.key)).size, 35)
})

test('provides the correct number and order of milestones for each supported plan', () => {
  const scopes = [
    ['Master', 'A1', 11],
    ['Master', 'A2', 11],
    ['Master', 'B', 12],
    ['Doctoral', '2.1', 12],
    ['Doctoral', '2.2', 12],
  ]

  for (const [degreeLevel, plan, expectedCount] of scopes) {
    const templates = templatesFor(degreeLevel, plan)
    assert.equal(templates.length, expectedCount, `${degreeLevel} ${plan} milestone count`)
    assert.ok(templates[0].key.endsWith('ethics-training'))
    assert.ok(templates.at(-1).key.endsWith('graduation'))
  }

  assert.ok(
    !templatesFor('Master', 'A1').some(({ key }) =>
      key.endsWith('comprehensive-exam') || key.endsWith('qualifying-exam'),
    ),
  )
  assert.ok(templatesFor('Master', 'B').some(({ key }) => key.endsWith('comprehensive-exam')))
  assert.ok(templatesFor('Doctoral', '2.1').some(({ key }) => key.endsWith('qualifying-exam')))
})

test('uses bilingual titles and excludes Doctoral Plan 1.1', () => {
  for (const template of defaultMilestoneTemplates) {
    assert.match(template.title, /^[^(]+ \(.+\)$/)
    assert.ok(!template.plans.includes('1.1'))
  }
})

test('defines a short evidence code for every default milestone', () => {
  for (const template of defaultMilestoneTemplates) {
    assert.match(template.evidenceCode, /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/)
    assert.ok(template.evidenceCode.length <= 24)
  }
})

test('uses bilingual descriptions when a description is provided', () => {
  for (const template of defaultMilestoneTemplates) {
    if (template.description !== null) {
      assert.match(template.description, /^[^\n]+\n\(.+\)$/)
    }
  }
})

test('stores form names and university links as separate references', () => {
  const englishTemplates = defaultMilestoneTemplates.filter(({ key }) =>
    key.endsWith('english-proficiency'),
  )
  assert.equal(englishTemplates.length, 3)
  for (const english of englishTemplates) {
    assert.equal(english.references[0], 'DGC24 – แบบยื่นผลการทดสอบความสามารถภาษาอังกฤษ')
    assert.equal(english.references[1], 'https://postgrads.mfu.ac.th')
  }
})

test('leaves all prerequisite rules for administrators to configure', () => {
  for (const template of defaultMilestoneTemplates) {
    assert.deepEqual(template.prerequisites, [])
  }
})

test('references valid prerequisite templates that occur earlier', () => {
  const templateByKey = new Map(
    defaultMilestoneTemplates.map((template) => [template.key, template]),
  )

  for (const template of defaultMilestoneTemplates) {
    for (const prerequisiteKey of template.prerequisites) {
      const prerequisite = templateByKey.get(prerequisiteKey)
      assert.ok(prerequisite, `${prerequisiteKey} must exist`)
      assert.ok(
        prerequisite.sequenceOrder < template.sequenceOrder,
        `${prerequisiteKey} must appear earlier than ${template.key}`,
      )
    }
  }
})
