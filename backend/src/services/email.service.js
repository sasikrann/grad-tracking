import net from 'node:net'
import tls from 'node:tls'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const smtpTimeoutMs = Number(process.env.SMTP_TIMEOUT_MS ?? 15000)

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required to send notification emails`)
  return value
}

function encodeHeader(value) {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
}

function normalizeAddress(value) {
  return String(value ?? '').replace(/[<>\r\n]/g, '').trim()
}

function envelopeAddress(value) {
  const address = String(value ?? '').match(/<([^<>]+)>/)?.[1] ?? value
  return normalizeAddress(address)
}

export function resolveNotificationEmailRecipients(recipients, environment = process.env) {
  const normalizedRecipients = [...new Set(recipients.map(normalizeAddress).filter(Boolean))]
  if (!normalizedRecipients.length) {
    throw new Error('No student email addresses were found for the selected audience')
  }

  if (String(environment.EMAIL_TEST_MODE ?? '').toLowerCase() !== 'true') {
    return normalizedRecipients
  }

  const testRecipient = normalizeAddress(environment.EMAIL_TEST_RECIPIENT)
  if (!testRecipient) {
    throw new Error('EMAIL_TEST_RECIPIENT is required when EMAIL_TEST_MODE is enabled')
  }
  return [testRecipient]
}

function base64(value) {
  return Buffer.from(String(value), 'utf8').toString('base64')
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function stripNotificationHtml(value) {
  return String(value ?? '')
    .replace(/&(?:nbsp|#160|#x0*a0);/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|ul|ol)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function createEmailHtml({ title, message, attachmentName }) {
  const attachmentHtml = attachmentName
    ? `<p><strong>Attachment:</strong> ${escapeHtml(attachmentName)}</p>`
    : ''

  return [
    '<!doctype html>',
    '<html>',
    '<body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">',
    `<h3 style="margin: 0 0 16px; font-size: 18px; line-height: 1.4; font-weight: 600;">${escapeHtml(title)}</h3>`,
    `<div>${message}</div>`,
    attachmentHtml,
    '</body>',
    '</html>',
  ].join('')
}

function createEmailText({ title, message, attachmentName }) {
  const lines = [title, '', stripNotificationHtml(message)]
  if (attachmentName) lines.push('', `Attachment: ${attachmentName}`)
  return lines.join('\n')
}

function attachmentContentType(fileName) {
  switch (path.extname(fileName).toLowerCase()) {
    case '.png': return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.gif': return 'image/gif'
    case '.pdf': return 'application/pdf'
    case '.csv': return 'text/csv'
    case '.txt': return 'text/plain'
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case '.xls': return 'application/vnd.ms-excel'
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case '.doc': return 'application/msword'
    default: return 'application/octet-stream'
  }
}

function foldedBase64(buffer) {
  return buffer.toString('base64').match(/.{1,76}/g)?.join('\r\n') ?? ''
}

export function createMimeMessage({ from, subject, html, text, attachment = null }) {
  const alternativeBoundary = `notification-alternative-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const alternativeBody = [
    `--${alternativeBoundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '',
    `--${alternativeBoundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    '',
    `--${alternativeBoundary}--`,
  ]

  if (attachment) {
    const mixedBoundary = `notification-mixed-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const safeFileName = encodeHeader(attachment.fileName).replace(/["\\]/g, '_')

    return [
      `From: ${from}`,
      'To: undisclosed-recipients:;',
      `Subject: ${encodeHeader(subject)}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      '',
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      '',
      ...alternativeBody,
      '',
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.contentType}; name="${safeFileName}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${safeFileName}"`,
      '',
      foldedBase64(attachment.content),
      '',
      `--${mixedBoundary}--`,
      '',
    ].join('\r\n')
  }

  return [
    `From: ${from}`,
    'To: undisclosed-recipients:;',
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    '',
    ...alternativeBody,
    '',
  ].join('\r\n')
}

function connectSmtp({ host, port, secure }) {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port })

    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error('SMTP connection timed out'))
    }, smtpTimeoutMs)

    const readyEvent = secure ? 'secureConnect' : 'connect'
    socket.once(readyEvent, () => {
      clearTimeout(timer)
      resolve(socket)
    })
    socket.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

function readSmtpResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = ''
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('SMTP response timed out'))
    }, smtpTimeoutMs)

    function cleanup() {
      clearTimeout(timer)
      socket.off('data', onData)
      socket.off('error', onError)
    }

    function onError(error) {
      cleanup()
      reject(error)
    }

    function onData(chunk) {
      buffer += chunk.toString('utf8')
      const lines = buffer.split(/\r?\n/).filter(Boolean)
      const lastLine = lines.at(-1)
      if (lastLine && /^\d{3} /.test(lastLine)) {
        cleanup()
        resolve(buffer)
      }
    }

    socket.on('data', onData)
    socket.once('error', onError)
  })
}

async function smtpCommand(socket, command, expectedCodes) {
  socket.write(`${command}\r\n`)
  const response = await readSmtpResponse(socket)
  const code = Number(response.slice(0, 3))
  if (!expectedCodes.includes(code)) {
    throw new Error(`SMTP command failed (${code}): ${response.trim()}`)
  }
  return response
}

async function expectSmtpResponse(socket, expectedCodes) {
  const response = await readSmtpResponse(socket)
  const code = Number(response.slice(0, 3))
  if (!expectedCodes.includes(code)) {
    throw new Error(`SMTP command failed (${code}): ${response.trim()}`)
  }
  return response
}

async function upgradeToTls(socket, host) {
  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect({ socket, servername: host }, () => resolve(secureSocket))
    secureSocket.once('error', reject)
  })
}

async function authenticate(socket, { user, pass }) {
  if (!user || !pass) return

  await smtpCommand(socket, 'AUTH LOGIN', [334])
  await smtpCommand(socket, base64(user), [334])
  await smtpCommand(socket, base64(pass), [235])
}

export async function sendNotificationEmail({ recipients, title, message, attachment = null }) {
  const normalizedRecipients = resolveNotificationEmailRecipients(recipients)
  const emailAttachment = attachment
    ? {
        fileName: attachment.fileName,
        contentType: attachmentContentType(attachment.fileName),
        content: await readFile(attachment.filePath),
      }
    : null

  if (emailAttachment?.content.length > 10 * 1024 * 1024) {
    throw new Error('Notification email attachment must not exceed 10 MB')
  }

  const host = requiredEnv('SMTP_HOST')
  const port = Number(process.env.SMTP_PORT ?? 587)
  const secure = String(process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || port === 465
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || user
  if (!from) throw new Error('SMTP_FROM or SMTP_USER is required to send notification emails')

  let socket = await connectSmtp({ host, port, secure })

  try {
    await readSmtpResponse(socket)
    await smtpCommand(socket, `EHLO ${process.env.SMTP_HELO_NAME ?? 'localhost'}`, [250])

    if (!secure && String(process.env.SMTP_STARTTLS ?? 'true').toLowerCase() !== 'false') {
      await smtpCommand(socket, 'STARTTLS', [220])
      socket = await upgradeToTls(socket, host)
      await smtpCommand(socket, `EHLO ${process.env.SMTP_HELO_NAME ?? 'localhost'}`, [250])
    }

    await authenticate(socket, { user, pass })
    await smtpCommand(socket, `MAIL FROM:<${envelopeAddress(from)}>`, [250])

    for (const recipient of normalizedRecipients) {
      await smtpCommand(socket, `RCPT TO:<${recipient}>`, [250, 251])
    }

    await smtpCommand(socket, 'DATA', [354])
    socket.write(
      `${createMimeMessage({
        from,
        subject: title,
        html: createEmailHtml({ title, message, attachmentName: emailAttachment?.fileName }),
        text: createEmailText({ title, message, attachmentName: emailAttachment?.fileName }),
        attachment: emailAttachment,
      }).replace(/^\./gm, '..')}\r\n.\r\n`,
    )
    await expectSmtpResponse(socket, [250])
    await smtpCommand(socket, 'QUIT', [221])
  } finally {
    socket.end()
  }

  return { recipientCount: normalizedRecipients.length }
}
