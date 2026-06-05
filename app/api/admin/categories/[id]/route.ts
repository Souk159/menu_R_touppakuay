import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Params) {
  const { id: idStr } = await params
  const id = parseInt(idStr)
  const { name, description, orderNum } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'ກະລຸນາໃສ່ຊື່ໝວດ' }, { status: 400 })

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description || '',
      orderNum: Number(orderNum) || 0,
    },
  })
  return NextResponse.json(category)
}

export async function DELETE(_: Request, { params }: Params) {
  const { id: idStr } = await params
  await prisma.category.delete({ where: { id: parseInt(idStr) } })
  return NextResponse.json({ success: true })
}
