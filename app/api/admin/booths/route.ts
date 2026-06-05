import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const [booths, billRequests] = await Promise.all([
    prisma.booth.findMany({
      include: {
        orders: {
          where: { status: { notIn: ['paid', 'rejected', 'cancelled'] } },
          select: { status: true },
        },
      },
      orderBy: [{ orderNum: 'asc' }, { id: 'asc' }],
    }),
    prisma.setting.findMany({ where: { key: { startsWith: 'bill_req_' } } }),
  ])

  const billReqSet = new Set(billRequests.filter((s) => s.value).map((s) => s.key))

  const result = booths.map(({ orders, ...booth }) => ({
    ...booth,
    activeCount: orders.length,
    servedCount: orders.filter((o) => o.status === 'served').length,
    unservedCount: orders.filter((o) => ['pending', 'confirmed'].includes(o.status)).length,
    canCheckout: orders.length > 0 && orders.every((o) => o.status === 'served'),
    billRequested: billReqSet.has(`bill_req_${booth.id}`),
  }))

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const { name, orderNum } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'ກາລຸນາໃສ່ຊື່ຕູບ' }, { status: 400 })

  const booth = await prisma.booth.create({
    data: { name: name.trim(), orderNum: Number(orderNum) || 0 },
  })
  return NextResponse.json(booth)
}
