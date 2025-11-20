import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const logConfig =
  process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error']

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logConfig,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
