import { defineConfig } from 'prisma/config'
import path from 'path'
import { readFileSync } from 'fs'

// Prisma skips auto .env loading when prisma.config.ts exists — load it manually
try {
  const envPath = path.join(process.cwd(), '.env')
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = val
  }
} catch { /* no .env file */ }

export default defineConfig({
  schema: path.join(process.cwd(), 'prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})
