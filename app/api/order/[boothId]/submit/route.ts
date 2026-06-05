import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

type Params = { params: Promise<{ boothId: string }> }

interface CartItem {
  menuItemId: number
  quantity: number
}

export async function POST(request: Request, { params }: Params) {
  const { boothId } = await params
  const id = parseInt(boothId)

  const booth = await prisma.booth.findUnique({ where: { id } })
  if (!booth) return NextResponse.json({ error: 'ບໍ່ພົບຕູບ' }, { status: 404 })
  if (!booth.isOpen) return NextResponse.json({ error: 'ຕູບ​ນີ້​ປິດ​ຢູ່' }, { status: 400 })

  const { items, note } = await request.json() as { items: CartItem[]; note?: string }
  if (!items?.length) return NextResponse.json({ error: 'ບໍ່ມີລາຍການ' }, { status: 400 })

  const allMenuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((i) => i.menuItemId) } },
  })

  const unavailable = allMenuItems.filter((m) => !m.isAvailable)
  if (unavailable.length > 0) {
    return NextResponse.json(
      { error: 'ລາຍການບາງອັນໝົດ', unavailableItemNames: unavailable.map((m) => m.name) },
      { status: 400 }
    )
  }

  const missingIds = items.filter((i) => !allMenuItems.find((m) => m.id === i.menuItemId))
  if (missingIds.length > 0) {
    return NextResponse.json({ error: 'ລາຍການບາງອັນບໍ່ຖືກຕ້ອງ' }, { status: 400 })
  }

  const menuItems = allMenuItems

  const totalAmount = items.reduce((sum, cartItem) => {
    const mi = menuItems.find((m) => m.id === cartItem.menuItemId)!
    return sum + Number(mi.price) * cartItem.quantity
  }, 0)

  const order = await prisma.order.create({
    data: {
      boothId: id,
      totalAmount,
      note: note || '',
      items: {
        create: items.map((cartItem) => {
          const mi = menuItems.find((m) => m.id === cartItem.menuItemId)!
          return {
            menuItemId: mi.id,
            itemName: mi.name,
            itemPrice: Number(mi.price),
            quantity: cartItem.quantity,
          }
        }),
      },
    },
    include: { items: true },
  })

  return NextResponse.json({ orderId: order.id, total: totalAmount })
}
