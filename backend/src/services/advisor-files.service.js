import ExcelJS from 'exceljs'
import { Readable } from 'node:stream'

import { ApiError } from '../errors/api-error.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function optionalText(value) {
  return String(value ?? '').trim()
}

function requiredText(value, field) {
  const text = optionalText(value)
  if (!text) throw new ApiError(400, `${field} is required`)
  return text
}

function requiredEmail(value) {
  const email = requiredText(value, 'email').toLowerCase()
  if (!emailPattern.test(email)) throw new ApiError(400, 'A valid email is required')
  return email
}

export function normalizeAdvisor(body, { advisorId } = {}) {
  return {
    advisorId: advisorId ?? optionalText(body.advisorId),
    fullName: requiredText(body.fullName, 'fullName'),
    email: requiredEmail(body.email),
  }
}

function cellValue(row, headerMap, names) {
  const key = names.find((name) => headerMap.has(name.toLowerCase()))
  if (!key) return ''

  const value = row.getCell(headerMap.get(key.toLowerCase())).value
  if (value && typeof value === 'object' && 'text' in value) return value.text

  return value ?? ''
}

export async function readAdvisorImportFile(file) {
  const workbook = new ExcelJS.Workbook()

  if (file.originalname.toLowerCase().endsWith('.csv')) {
    await workbook.csv.read(Readable.from(file.buffer))
  } else {
    await workbook.xlsx.load(file.buffer)
  }

  const sheet = workbook.worksheets[0]
  if (!sheet || sheet.rowCount < 2) throw new ApiError(400, 'The import file has no advisor rows')

  const headerMap = new Map()
  sheet.getRow(1).eachCell((cell, column) => {
    headerMap.set(String(cell.value ?? '').trim().toLowerCase(), column)
  })

  const records = []
  const validationErrors = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || !row.hasValues) return

    try {
      records.push(
        normalizeAdvisor({
          advisorId: cellValue(row, headerMap, ['advisorid', 'advisor id']),
          fullName: cellValue(row, headerMap, ['fullname', 'full name', 'name', 'advisor name']),
          email: cellValue(row, headerMap, ['email', 'advisor email']),
        }),
      )
    } catch (error) {
      validationErrors.push(`Row ${rowNumber}: ${error.message}`)
    }
  })

  if (validationErrors.length) {
    throw new ApiError(400, validationErrors.join('; '))
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
