import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ boothId: string }> }

// Customer requests bill
export async function POST(_: Request, { params }: Params) {
  const { boothId } = await params
  const key = `bill_req_${boothId}`
  await prisma.setting.upsert({
    where: { key },
    update: { value: new Date().toISOString() },
    create: { key, value: new Date().toISOString() },
  })
  return NextResponse.json({ ok: true })
}

// Admin/checkout clears bill request
export async function DELETE(_: Request, { params }: Params) {
  const { boothId } = await params
  const key = `bill_req_${boothId}`
  await prisma.setting.deleteMany({ where: { key } })
  return NextResponse.json({ ok: true })
}
