import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const { id: idStr } = await params
  const id = parseInt(idStr)
  const body = await request.json()

  // Remove a single item from a pending order
  if (body.action === 'removeItem') {
    const { orderItemId } = body as { orderItemId: number }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!order) return NextResponse.json({ error: 'ບໍ່ພົບ order' }, { status: 404 })
    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'ລຶບ​ໄດ້​ສະ​ເພາະ​ຄຳ​ສັ່ງ​ທີ່​ລໍ​ຖ້າ' }, { status: 400 })
    }

    await prisma.orderItem.delete({ where: { id: orderItemId } })

    const remaining = order.items.filter((i) => i.id !== orderItemId)

    if (remaining.length === 0) {
      // No items left — auto-reject
      const updated = await prisma.order.update({
        where: { id },
        data: { status: 'rejected', rejectReason: 'ລາຍ​ການ​ໃນ​ຄຳ​ສັ່ງ​ໝົດ​ທຸກ​ອັນ', totalAmount: 0 },
        include: { items: true, booth: { select: { name: true } } },
      })
      return NextResponse.json({ ...updated, totalAmount: 0, items: [] })
    }

    const newTotal = remaining.reduce((s, i) => s + Number(i.itemPrice) * i.quantity, 0)
    const updated = await prisma.order.update({
      where: { id },
      data: { totalAmount: newTotal },
      include: { items: true, booth: { select: { name: true } } },
    })
    return NextResponse.json({
      ...updated,
      totalAmount: newTotal,
      items: updated.items.map((i) => ({ ...i, itemPrice: Number(i.itemPrice) })),
    })
  }

  // Change order status
  const { status, rejectReason } = body
  if (!['confirmed', 'rejected', 'served'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status, rejectReason: rejectReason || '' },
  })
  return NextResponse.json({ ...order, totalAmount: Number(order.totalAmount) })
}
