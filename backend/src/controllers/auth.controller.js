// ใช้จัดการการเข้าสู่ระบบด้วย Google SSO ของ Lamduan Mail
// ตรวจสอบว่า email เป็นของ lamduan.mfu.ac.th และมีอยู่ในระบบไหม
import { OAuth2Client } from "google-auth-library";

import { ApiError } from "../errors/api-error.js";
import { createAccessToken } from "../middleware/auth.middleware.js";
import { findAuthorizedUserByEmail } from "../services/auth.service.js";

const googleClient = new OAuth2Client();
const lamduanDomain = "lamduan.mfu.ac.th";

export async function loginWithGoogle(request, response) {
  const credential = typeof request.body.credential === "string" ? request.body.credential : "";
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new ApiError(503, "Google SSO is not configured");
  }

  if (!credential) {
    throw new ApiError(400, "Google credential is required");
  }

  let payload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, "Invalid Google credential");
  }

  const email = payload?.email?.toLowerCase();
  const isLamduanMail =
    payload?.email_verified === true &&
    payload?.hd === lamduanDomain &&
    email?.endsWith(`@${lamduanDomain}`);

  if (!isLamduanMail) {
    throw new ApiError(403, "Please sign in using your Lamduan Mail account");
  }

  const user = await findAuthorizedUserByEmail(email);

  if (!user) {
    throw new ApiError(403, "Your Lamduan Mail account is not registered in this system");
  }

  response.json({
    data: {
      token: createAccessToken(user),
      user,
    },
  });
}

/**
 * DEVELOPMENT LOGIN BYPASS
 * Available only when explicitly enabled for local development.
 */
export async function loginForDevelopment(request, response) {
  // WARNING: Development login bypass must be disabled in production environments.
  // This endpoint intentionally verifies that NODE_ENV !== 'production' and that
  // ENABLE_DEV_LOGIN is explicitly set to 'true' before allowing local development
  // login. Do not enable this in deployed production systems.
  const isEnabled =
    process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_LOGIN === "true";
  const remoteAddress = request.socket.remoteAddress ?? "";
  const isLocalRequest =
    remoteAddress === "::1" ||
    remoteAddress.startsWith("127.") ||
    remoteAddress.startsWith("::ffff:127.");

  if (!isEnabled || !isLocalRequest) {
    throw new ApiError(404, "Development login is disabled");
  }

  const email =
    typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await findAuthorizedUserByEmail(email);

  if (!user) {
    throw new ApiError(403, "This email is not registered in the system");
  }

  response.json({
    data: {
      token: createAccessToken(user),
      user,
    },
  });
}

export async function getCurrentUser(request, response) {
  const user = await findAuthorizedUserByEmail(request.user.email);

  if (!user) {
    throw new ApiError(401, "User account is no longer available");
  }

  response.json({ data: user });
}
