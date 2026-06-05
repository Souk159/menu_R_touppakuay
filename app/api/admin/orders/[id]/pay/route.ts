import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const { id: idStr } = await params
  const id = parseInt(idStr)
  const { paymentMethod, paymentAmount } = await request.json()

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: 'paid',
      paymentMethod,
      paymentAmount: Number(paymentAmount),
      paidAt: new Date(),
    },
  })

  return NextResponse.json({ ...order, totalAmount: Number(order.totalAmount) })
}
