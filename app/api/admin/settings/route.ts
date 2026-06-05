import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const PUBLIC_KEYS = new Set(['name', 'tagline', 'address', 'phone'])

export async function GET() {
  const settings = await prisma.setting.findMany({
    where: { key: { in: [...PUBLIC_KEYS] } },
  })
  return NextResponse.json(Object.fromEntries(settings.map((s) => [s.key, s.value])))
}

export async function PUT(request: Request) {
  const { name, tagline, address, phone } = await request.json()
  const entries = [
    { key: 'name',    value: (name    || '').toString().slice(0, 200) },
    { key: 'tagline', value: (tagline || '').toString().slice(0, 300) },
    { key: 'address', value: (address || '').toString().slice(0, 300) },
    { key: 'phone',   value: (phone   || '').toString().slice(0, 50)  },
  ]

  for (const entry of entries) {
    await prisma.setting.upsert({
      where: { key: entry.key },
      update: { value: entry.value },
      create: entry,
    })
  }
  return NextResponse.json({ success: true })
}
