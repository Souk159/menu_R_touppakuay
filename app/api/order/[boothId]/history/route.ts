import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ boothId: string }> }

export async function GET(_: Request, { params }: Params) {
  const { boothId } = await params
  const id = parseInt(boothId)

  const booth = await prisma.booth.findUnique({ where: { id } })
  if (!booth) return NextResponse.json({ error: 'ບໍ່ພົບຕູບ' }, { status: 404 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Session boundary = latest of: last checkout (paidAt) OR last booth-open event
  const [lastPaid, sessionSetting] = await Promise.all([
    prisma.order.findFirst({
      where: { boothId: id, status: 'paid' },
      orderBy: { paidAt: 'desc' },
      select: { paidAt: true },
    }),
    prisma.setting.findUnique({ where: { key: `booth_session_${id}` } }),
  ])

  const timestamps = [
    today,
    lastPaid?.paidAt,
    sessionSetting?.value ? new Date(sessionSetting.value) : null,
  ].filter(Boolean) as Date[]

  // Use the most recent boundary
  const since = new Date(Math.max(...timestamps.map((d) => d.getTime())))

  const orders = await prisma.order.findMany({
    where: {
      boothId: id,
      createdAt: { gt: since },
      status: { not: 'paid' },
    },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      note: o.note,
      rejectReason: o.rejectReason,
      createdAt: o.createdAt,
      items: o.items.map((i) => ({
        id: i.id,
        name: i.itemName,
        price: Number(i.itemPrice),
        quantity: i.quantity,
      })),
    }))
  )
}
