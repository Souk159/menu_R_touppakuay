import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const rawSecret = process.env.JWT_SECRET
if (!rawSecret) throw new Error('JWT_SECRET environment variable is not set')
const SECRET = new TextEncoder().encode(rawSecret)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminPage = pathname.startsWith('/admin/dashboard')
  const isAdminApi =
    pathname.startsWith('/api/admin') &&
    !pathname.startsWith('/api/admin/login') &&
    !pathname.startsWith('/api/admin/logout')

  if (!isAdminPage && !isAdminApi) return NextResponse.next()

  const token = request.cookies.get('admin-token')?.value
  if (!token) {
    if (isAdminPage) return NextResponse.redirect(new URL('/admin', request.url))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    if (isAdminPage) return NextResponse.redirect(new URL('/admin', request.url))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/api/admin/:path*'],
}
