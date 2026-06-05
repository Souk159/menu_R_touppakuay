import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const settings = await prisma.setting.findMany()
  return NextResponse.json(Object.fromEntries(settings.map((s) => [s.key, s.value])))
}
