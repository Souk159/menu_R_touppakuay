import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/auth'

// Simple in-memory rate limiter: max 10 attempts per IP per 15 minutes
const attempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'ພະຍາຍາມຫຼາຍຄັ້ງເກີນໄປ ກະລຸນາລໍຖ້າ 15 ນາທີ' }, { status: 429 })
    }

    const { username, password } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກ' }, { status: 401 })
    }

    const admin = await prisma.admin.findUnique({ where: { username: String(username).slice(0, 100) } })
    if (!admin || !(await bcrypt.compare(String(password).slice(0, 200), admin.passwordHash))) {
      return NextResponse.json({ error: 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກ' }, { status: 401 })
    }

    const token = await signToken({ adminId: admin.id, username: admin.username })
    const response = NextResponse.json({ success: true, username: admin.username })
    response.cookies.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'ເກີດຂໍ້ຜິດພາດ' }, { status: 500 })
  }
}
