import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const boothId = searchParams.get('boothId')
  const status = searchParams.get('status')

  const orders = await prisma.order.findMany({
    where: {
      ...(boothId ? { boothId: parseInt(boothId) } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      booth: { select: { name: true } },
      items: true,
    },
    orderBy: [
      { status: 'asc' },  // pending comes first alphabetically before 'paid'/'rejected'
      { createdAt: 'desc' },
    ],
  })

  // Sort: pending first, then confirmed, then others, newest within each group
  const STATUS_ORDER: Record<string, number> = { pending: 0, confirmed: 1, served: 2, paid: 3, rejected: 4 }
  orders.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))

  return NextResponse.json(
    orders.map((o) => ({
      ...o,
      totalAmount: Number(o.totalAmount),
      paymentAmount: o.paymentAmount ? Number(o.paymentAmount) : null,
      items: o.items.map((i) => ({
        ...i,
        itemPrice: Number(i.itemPrice),
      })),
    }))
  )
}
