import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ boothId: string }> }

export async function GET(_: Request, { params }: Params) {
  const { boothId } = await params
  const id = parseInt(boothId)

  const booth = await prisma.booth.findUnique({ where: { id } })
  if (!booth) return NextResponse.json({ error: 'ບໍ່ພົບຕູບ' }, { status: 404 })

  const categories = await prisma.category.findMany({
    include: {
      items: {
        where: { isAvailable: true },
        orderBy: [{ orderNum: 'asc' }, { id: 'asc' }],
      },
    },
    orderBy: [{ orderNum: 'asc' }, { id: 'asc' }],
  })

  return NextResponse.json({
    booth: { id: booth.id, name: booth.name, isOpen: booth.isOpen },
    categories: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      items: cat.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        imageUrl: item.imageUrl,
      })),
    })),
  })
}
