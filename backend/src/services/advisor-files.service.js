import ExcelJS from 'exceljs'
import { Readable } from 'node:stream'

import { ApiError } from '../errors/api-error.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const organizationEmailPattern = /^[^\s@]+@mfu\.ac\.th$/i
const importRequiredFields = [
  { key: 'advisorId', label: 'Advisor ID' },
  { key: 'fullName', label: 'Full Name' },
  { key: 'email', label: 'Email' },
]

function optionalText(value) {
  return String(value ?? '').trim()
}

function requiredText(value, field) {
  const text = optionalText(value)
  if (!text) throw new ApiError(400, `${field} is required`)
  return text
}

function requiredEmail(value) {
  const email = requiredText(normalizeEmailText(value), 'email').toLowerCase()
  if (!emailPattern.test(email)) throw new ApiError(400, 'A valid email is required')
  if (!organizationEmailPattern.test(email)) {
    throw new ApiError(400, 'กรุณากรอกอีเมลในองค์กรเท่านั้น')
  }
  return email
}

function missingFieldMessage(label) {
  return `${label} is missing.`
}

function missingFieldLabel(message) {
  return message.replace(/\s+is missing\.$/i, '')
}

function formatMissingFieldsMessage(messages) {
  const labels = messages.map(missingFieldLabel)

  if (labels.length === 0) return ''
  if (labels.length === 1) return `${labels[0]} is missing.`
  if (labels.length === 2) return `${labels[0]} and ${labels[1]} are missing.`

  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)} are missing.`
}

export function normalizeAdvisor(body, { advisorId } = {}) {
  return {
    advisorId: advisorId ?? optionalText(body.advisorId),
    fullName: requiredText(body.fullName, 'fullName'),
    email: requiredEmail(body.email),
  }
}

function cellValue(row, headerMap, names) {
  const key = names.find((name) => headerMap.has(normalizeHeader(name)))
  if (!key) return ''

  const value = row.getCell(headerMap.get(normalizeHeader(key))).value
  return normalizeCellText(value)
}

function emailCellValue(row, headerMap, names) {
  const key = names.find((name) => headerMap.has(normalizeHeader(name)))
  if (!key) return ''

  return normalizeEmailText(row.getCell(headerMap.get(normalizeHeader(key))).value)
}

function normalizeHeader(value) {
  return normalizeCellText(value)
    .toLowerCase()
    .replace(/[\s_.\-/()]+/g, '')
}

function normalizeCellText(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    if ('text' in value) return normalizeCellText(value.text)
    if ('hyperlink' in value) return normalizeCellText(value.hyperlink)
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => normalizeCellText(part.text)).join('')
    }
    if ('result' in value) return normalizeCellText(value.result)
  }
  return String(value).trim()
}

function normalizeEmailText(value) {
  const text = [
    value && typeof value === 'object' && 'hyperlink' in value ? value.hyperlink : '',
    normalizeCellText(value),
  ]
    .join(' ')
    .replace(/^mailto:/i, '')
    .replace(/\bmailto:/gi, ' ')
    .split('?')[0]
    .trim()

  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match?.[0] ?? text
}

export async function readAdvisorImportFile(file) {
  const workbook = new ExcelJS.Workbook()

  if (file.originalname.toLowerCase().endsWith('.csv')) {
    await workbook.csv.read(Readable.from(file.buffer))
  } else {
    await workbook.xlsx.load(file.buffer)
  }

  const sheet = workbook.worksheets[0]
  if (!sheet || sheet.rowCount < 2) throw new ApiError(400, 'No data found.')

  const headerMap = new Map()
  sheet.getRow(1).eachCell((cell, column) => {
    headerMap.set(normalizeHeader(cell.value), column)
  })

  const headerTexts = sheet.getRow(1).values.slice(1).map(normalizeCellText).filter(Boolean)
  if (headerTexts.length > 0 && headerTexts.every((header) => /^[?\s_-]+$/.test(header))) {
    throw new ApiError(
      400,
      'The CSV text encoding is corrupted and Thai characters were replaced with ?. Please export or save the original file as UTF-8 CSV and import it again.',
    )
  }

  const records = []
  const validationErrors = new Set()
  const missingFieldErrors = new Set()

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || !row.hasValues) return

    const rawAdvisor = {
      advisorId: cellValue(row, headerMap, ['advisorid', 'advisor id', 'รหัสอาจารย์']),
      fullName: cellValue(row, headerMap, [
        'fullname',
        'full name',
        'name',
        'advisor name',
        'ชื่อ-สกุล',
        'ชื่อ นามสกุล',
        'ชื่ออาจารย์',
      ]),
      email: emailCellValue(row, headerMap, ['email', 'advisor email', 'อีเมล', 'อีเมล์']),
    }
    const rowMissingFields = importRequiredFields
      .filter((field) => !optionalText(rawAdvisor[field.key]))
      .map((field) => missingFieldMessage(field.label))

    if (rowMissingFields.length) {
      rowMissingFields.forEach((message) => missingFieldErrors.add(message))
      return
    }

    try {
      records.push(normalizeAdvisor(rawAdvisor))
    } catch (error) {
      validationErrors.add(error.message)
    }
  })

  const allValidationErrors = [
    formatMissingFieldsMessage([...missingFieldErrors]),
    ...validationErrors,
  ].filter(Boolean)

  if (allValidationErrors.length) {
    const organizationEmailError = allValidationErrors.find(
      (message) => message === 'กรุณากรอกอีเมลในองค์กรเท่านั้น',
    )
    throw new ApiError(
      400,
      organizationEmailError ?? 'Please complete all required fields and import the file again.',
    )
  }

  if (!records.length) throw new ApiError(400, 'No data found.')

  const duplicateAdvisorIds = records
    .map((record) => record.advisorId.toLocaleLowerCase())
    .filter((advisorId, index, values) => values.indexOf(advisorId) !== index)
  if (duplicateAdvisorIds.length) {
    throw new ApiError(400, 'Duplicate Advisor ID found in the import file.')
  }

  return records
}

function addAdvisorExportHeaders(worksheet) {
  worksheet.columns = [
    { header: 'Advisor ID', key: 'advisorId', width: 16 },
    { header: 'Full Name', key: 'fullName', width: 28 },
    { header: 'Email', key: 'email', width: 32 },
  ]
  worksheet.getRow(1).font = { bold: true }
}

function addAdvisorTemplateHeaders(worksheet) {
  worksheet.columns = [
    { header: 'Advisor ID', key: 'advisorId', width: 16 },
    { header: 'Full Name', key: 'fullName', width: 28 },
    { header: 'Email', key: 'email', width: 32 },
  ]
  worksheet.getRow(1).font = { bold: true }
}

export async function createAdvisorExportBuffer(advisors) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Advisors')

  addAdvisorExportHeaders(worksheet)
  worksheet.addRows(advisors)

  return Buffer.from(await workbook.xlsx.writeBuffer())
}

export async function createAdvisorTemplateBuffer() {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Advisors')

  addAdvisorTemplateHeaders(worksheet)

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
