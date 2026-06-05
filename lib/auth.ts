import { SignJWT, jwtVerify } from 'jose'

const rawSecret = process.env.JWT_SECRET
if (!rawSecret) throw new Error('JWT_SECRET environment variable is not set')

const SECRET = new TextEncoder().encode(rawSecret)

export async function signToken(payload: { adminId: number; username: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(SECRET)
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, SECRET)
  return payload as { adminId: number; username: string }
}
