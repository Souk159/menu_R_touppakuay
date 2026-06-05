import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existingAdmin = await prisma.admin.findFirst()
  if (!existingAdmin) {
    await prisma.admin.create({
      data: {
        username: 'admin',
        passwordHash: await bcrypt.hash('admin123', 10),
      },
    })
    console.log('✅ Created default admin: admin / admin123')
  }

  const defaultSettings = [
    { key: 'name', value: 'ຮ້ານອາຫານ' },
    { key: 'tagline', value: 'ອາຫານອຣ່ອຍ ສົດໃໝ່ ທຸກວັນ' },
    { key: 'address', value: '' },
    { key: 'phone', value: '' },
  ]

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }

  console.log('✅ Settings initialized')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
