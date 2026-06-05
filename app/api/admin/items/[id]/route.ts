import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'

type Params = { params: Promise<{ id: string }> }

async function saveUploadedFile(file: File): Promise<string> {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadsDir, { recursive: true })
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(uploadsDir, filename), buffer)
  return `/uploads/${filename}`
}

export async function PUT(request: Request, { params }: Params) {
  const { id: idStr } = await params
  const id = parseInt(idStr)

  const existing = await prisma.menuItem.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'ບໍ່ພົບລາຍການ' }, { status: 404 })

  const formData = await request.formData()
  const categoryId = parseInt(formData.get('categoryId') as string)
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string) || ''
  const price = parseFloat(formData.get('price') as string)
  const isAvailable = formData.get('isAvailable') !== 'false'
  const orderNum = parseInt(formData.get('orderNum') as string) || 0

  let imageUrl = existing.imageUrl
  const file = formData.get('image') as File | null
  if (file && file.size > 0) {
    if (existing.imageUrl) {
      const oldPath = path.join(process.cwd(), 'public', existing.imageUrl)
      unlink(oldPath).catch(() => {})
    }
    imageUrl = await saveUploadedFile(file)
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data: { categoryId, name, description, price, imageUrl, isAvailable, orderNum },
  })
  return NextResponse.json({ ...item, price: Number(item.price) })
}

export async function DELETE(_: Request, { params }: Params) {
  const { id: idStr } = await params
  const id = parseInt(idStr)
  const item = await prisma.menuItem.findUnique({ where: { id } })
  if (item?.imageUrl) {
    unlink(path.join(process.cwd(), 'public', item.imageUrl)).catch(() => {})
  }
  await prisma.menuItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request, { params }: Params) {
  const { id: idStr } = await params
  const id = parseInt(idStr)
  const { isAvailable } = await request.json()
  const item = await prisma.menuItem.update({ where: { id }, data: { isAvailable } })
  return NextResponse.json({ ...item, price: Number(item.price) })
}
