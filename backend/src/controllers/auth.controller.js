import { OAuth2Client } from 'google-auth-library'

import { ApiError } from '../errors/api-error.js'
import { findAuthorizedUserByEmail } from '../services/auth.service.js'

const googleClient = new OAuth2Client()
const lamduanDomain = 'lamduan.mfu.ac.th'

export async function loginWithGoogle(request, response) {
  const credential = typeof request.body.credential === 'string' ? request.body.credential : ''
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    throw new ApiError(503, 'Google SSO is not configured')
  }

  if (!credential) {
    throw new ApiError(400, 'Google credential is required')
  }

  let payload

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    })
    payload = ticket.getPayload()
  } catch {
    throw new ApiError(401, 'Invalid Google credential')
  }

  const email = payload?.email?.toLowerCase()
  const isLamduanMail =
    payload?.email_verified === true &&
    payload?.hd === lamduanDomain &&
    email?.endsWith(`@${lamduanDomain}`)

  if (!isLamduanMail) {
    throw new ApiError(403, 'Please sign in using your Lamduan Mail account')
  }

  const user = await findAuthorizedUserByEmail(email)

  if (!user) {
    throw new ApiError(403, 'Your Lamduan Mail account is not registered in this system')
  }

  response.json({ data: user })
}
