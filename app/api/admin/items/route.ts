import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

async function saveUploadedFile(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('ອະນຸຍາດສະເພາະ JPG, PNG, WEBP, GIF')
  if (file.size > MAX_FILE_SIZE) throw new Error('ຮູບໃຫຍ່ເກີນ 5MB')

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadsDir, { recursive: true })

  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[file.type] ?? 'jpg'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(uploadsDir, filename), buffer)
  return `/uploads/${filename}`
}

export async function GET() {
  const items = await prisma.menuItem.findMany({
    include: { category: { select: { name: true } } },
    orderBy: [{ category: { orderNum: 'asc' } }, { orderNum: 'asc' }, { id: 'asc' }],
  })
  return NextResponse.json(items.map((i) => ({ ...i, price: Number(i.price) })))
}

export async function POST(request: Request) {
  const formData = await request.formData()

  const categoryId = parseInt(formData.get('categoryId') as string)
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string) || ''
  const price = parseFloat(formData.get('price') as string)
  const isAvailable = formData.get('isAvailable') !== 'false'
  const orderNum = parseInt(formData.get('orderNum') as string) || 0

  if (!name || !categoryId || isNaN(price)) {
    return NextResponse.json({ error: 'ຂໍ້ມູນບໍ່ຄົບ' }, { status: 400 })
  }

  let imageUrl = ''
  const file = formData.get('image') as File | null
  if (file && file.size > 0) {
    try {
      imageUrl = await saveUploadedFile(file)
    } catch (err: unknown) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ' }, { status: 400 })
    }
  }

  const item = await prisma.menuItem.create({
    data: { categoryId, name, description, price, imageUrl, isAvailable, orderNum },
  })
  return NextResponse.json({ ...item, price: Number(item.price) })
}
