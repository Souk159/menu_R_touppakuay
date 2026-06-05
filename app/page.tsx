import { prisma } from '@/lib/prisma'
import MenuPage from '@/components/menu/MenuPage'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [rawCategories, settings] = await Promise.all([
    prisma.category.findMany({
      include: {
        items: { orderBy: [{ orderNum: 'asc' }, { id: 'asc' }] },
      },
      orderBy: [{ orderNum: 'asc' }, { id: 'asc' }],
    }),
    prisma.setting.findMany(),
  ])

  const categories = rawCategories.map((cat) => ({
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

  const settingsObj = Object.fromEntries(settings.map((s) => [s.key, s.value]))

  return <MenuPage categories={categories} settings={settingsObj} />
}
