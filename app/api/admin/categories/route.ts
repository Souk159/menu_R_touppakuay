import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { items: true } } },
    orderBy: [{ orderNum: 'asc' }, { id: 'asc' }],
  })
  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const { name, description, orderNum } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'ກະລຸນາໃສ່ຊື່ໝວດ' }, { status: 400 })

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      description: description || '',
      orderNum: Number(orderNum) || 0,
    },
  })
  return NextResponse.json(category)
}
