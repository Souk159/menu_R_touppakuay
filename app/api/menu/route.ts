import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        items: { orderBy: [{ orderNum: 'asc' }, { id: 'asc' }] },
      },
      orderBy: [{ orderNum: 'asc' }, { id: 'asc' }],
    })

    const result = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      orderNum: cat.orderNum,
      items: cat.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        orderNum: item.orderNum,
      })),
    }))

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to load menu' }, { status: 500 })
  }
}
