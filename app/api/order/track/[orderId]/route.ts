import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ orderId: string }> }

export async function GET(_: Request, { params }: Params) {
  const { orderId } = await params
  const id = parseInt(orderId)

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      booth: { select: { name: true } },
    },
  })

  if (!order) return NextResponse.json({ error: 'ບໍ່ພົບ order' }, { status: 404 })

  return NextResponse.json({
    id: order.id,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    rejectReason: order.rejectReason,
    boothName: order.booth.name,
    note: order.note,
    items: order.items.map((i) => ({
      name: i.itemName,
      price: Number(i.itemPrice),
      quantity: i.quantity,
    })),
  })
}

export async function PATCH(request: Request, { params }: Params) {
  const { orderId } = await params
  const id = parseInt(orderId)
  const { action, boothId } = await request.json()

  if (action !== 'cancel') {
    return NextResponse.json({ error: 'action ບໍ່ຖືກຕ້ອງ' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return NextResponse.json({ error: 'ບໍ່ພົບ order' }, { status: 404 })

  // Verify the order belongs to the booth the request claims
  if (!boothId || order.boothId !== parseInt(String(boothId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (order.status !== 'pending') {
    return NextResponse.json({ error: 'ຍົກ​ເລີກ​ໄດ້​ສະ​ເພາະ​ຄຳ​ສັ່ງ​ທີ່​ລໍ​ຖ້າ​ເທົ່າ​ນັ້ນ' }, { status: 400 })
  }

  await prisma.order.update({ where: { id }, data: { status: 'cancelled' } })
  return NextResponse.json({ ok: true })
}
