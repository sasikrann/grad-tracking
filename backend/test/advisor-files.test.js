import assert from 'node:assert/strict'
import test from 'node:test'
import ExcelJS from 'exceljs'

import { readAdvisorImportFile } from '../src/services/advisor-files.service.js'

function csvFile(contents) {
  return { originalname: 'advisors.csv', buffer: Buffer.from(contents) }
}

test('reads an organization email from an Excel hyperlink', async () => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Advisors')
  sheet.addRow(['Advisor ID', 'Full Name', 'Email'])
  sheet.addRow([
    'A001',
    'Test Advisor',
    { text: 'Contact advisor', hyperlink: 'mailto:advisor@mfu.ac.th' },
  ])
  const file = {
    originalname: 'advisors.xlsx',
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  }

  const [advisor] = await readAdvisorImportFile(file)

  assert.equal(advisor.email, 'advisor@mfu.ac.th')
})

test('accepts normalized Thai headers', async () => {
  const [advisor] = await readAdvisorImportFile(
    csvFile('รหัสอาจารย์,ชื่อ-สกุล,อีเมล\nA001,อาจารย์ ทดสอบ,advisor@mfu.ac.th'),
  )

  assert.deepEqual(advisor, {
    advisorId: 'A001',
    fullName: 'อาจารย์ ทดสอบ',
    email: 'advisor@mfu.ac.th',
  })
})

test('rejects non-organization advisor emails with the requested message', async () => {
  await assert.rejects(
    readAdvisorImportFile(
      csvFile('Advisor ID,Full Name,Email\nA001,Test Advisor,advisor@example.com'),
    ),
    (error) => {
      assert.equal(error.statusCode, 400)
      assert.equal(error.message, 'กรุณากรอกอีเมลในองค์กรเท่านั้น')
      return true
    },
  )
})

test('rejects incomplete advisor rows with the same generic import message as students', async () => {
  await assert.rejects(
    readAdvisorImportFile(csvFile('Advisor ID,Full Name,Email\nA001,,')),
    (error) => {
      assert.equal(error.statusCode, 400)
      assert.equal(error.message, 'Please complete all required fields and import the file again.')
      return true
    },
  )
})

test('reports corrupted question-mark CSV encoding clearly', async () => {
  await assert.rejects(
    readAdvisorImportFile(csvFile('????????????,????-????,?????\nA001,Test,advisor@mfu.ac.th')),
    /Thai characters were replaced with \?/,
  )
})
