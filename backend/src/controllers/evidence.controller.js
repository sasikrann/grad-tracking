import path from 'node:path'

import { ApiError } from '../errors/api-error.js'
import { canAccessEvidence, findEvidenceByUrl } from '../services/evidence.service.js'

const evidenceUrlPattern = /^\/uploads\/evidence\/[A-Za-z0-9._-]+$/
const evidenceDirectory = path.resolve('uploads/evidence')

export async function viewEvidence(request, response, next) {
  const evidenceUrl = String(request.query.path ?? '').trim()
  if (!evidenceUrlPattern.test(evidenceUrl)) {
    throw new ApiError(400, 'A valid evidence path is required')
  }

  const evidence = await findEvidenceByUrl(evidenceUrl)
  if (!evidence) throw new ApiError(404, 'Evidence not found')
  if (!canAccessEvidence(request.user, evidence)) {
    throw new ApiError(403, 'You do not have permission to access this evidence')
  }

  response.set({
    'Cache-Control': 'private, no-store',
    'Content-Disposition': `inline; filename="${path.basename(evidence.evidenceUrl)}"`,
  })
  response.sendFile(path.basename(evidence.evidenceUrl), { root: evidenceDirectory }, (error) => {
    if (error) next(error)
  })
}
