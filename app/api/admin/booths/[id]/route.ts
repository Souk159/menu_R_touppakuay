import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const { id: idStr } = await params
  const id = parseInt(idStr)
  const { name, orderNum } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'ກາລຸນາໃສ່ຊື່ຕູບ' }, { status: 400 })

  const booth = await prisma.booth.update({
    where: { id },
    data: { name: name.trim(), orderNum: Number(orderNum) || 0 },
  })
  return NextResponse.json(booth)
}

export async function PATCH(request: Request, { params }: Params) {
  const { id: idStr } = await params
  const id = parseInt(idStr)
  const { isOpen } = await request.json()

  // When opening a booth, stamp a new session start time
  if (isOpen === true) {
    const key = `booth_session_${id}`
    await prisma.setting.upsert({
      where: { key },
      update: { value: new Date().toISOString() },
      create: { key, value: new Date().toISOString() },
    })
  }

  const booth = await prisma.booth.update({
    where: { id },
    data: { isOpen },
  })
  return NextResponse.json(booth)
}

export async function DELETE(_: Request, { params }: Params) {
  const { id: idStr } = await params
  await prisma.booth.delete({ where: { id: parseInt(idStr) } })
  return NextResponse.json({ success: true })
}
