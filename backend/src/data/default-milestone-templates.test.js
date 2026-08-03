import assert from 'node:assert/strict'
import test from 'node:test'

import { defaultMilestoneTemplates } from './default-milestone-templates.js'

test('defines the complete ordered set of 12 default milestone templates', () => {
  assert.equal(defaultMilestoneTemplates.length, 12)
  assert.equal(new Set(defaultMilestoneTemplates.map((template) => template.key)).size, 12)
  assert.deepEqual(
    defaultMilestoneTemplates.map((template) => template.title),
    [
      'Attend Ethics Training',
      'Submit English Proficiency Test Result',
      'Appoint an Advisor',
      'Complete Required Courses',
      'Pass the Qualifying Exam',
      'Pass the Comprehensive Exam',
      'Pass Proposal Exam',
      'Pass Defense Exam',
      'Pass Format Checking',
      'Submit the Complete Thesis File',
      'Publish Research Findings',
      'Graduate',
    ],
  )
})

test('only references prerequisite templates that appear earlier in the sequence', () => {
  const orderByKey = new Map(
    defaultMilestoneTemplates.map((template, index) => [template.key, index]),
  )

  for (const [index, template] of defaultMilestoneTemplates.entries()) {
    for (const prerequisite of template.prerequisites) {
      assert.ok(orderByKey.has(prerequisite), `${prerequisite} must exist`)
      assert.ok(orderByKey.get(prerequisite) < index, `${prerequisite} must appear earlier`)
    }
  }
})
