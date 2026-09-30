import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export type StaffUser = { id: string; role: 'ADMIN' | 'BARBER' }

// Sessão NextAuth de admin ou barbeiro (o painel /admin usa as duas).
export async function requireStaff(allowed: StaffUser['role'][] = ['ADMIN', 'BARBER']): Promise<StaffUser | null> {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string; role?: string } | undefined
  const role = (user?.role || '').toString().toUpperCase()
  if (!user?.id || !allowed.includes(role as StaffUser['role'])) return null
  return { id: user.id, role: role as StaffUser['role'] }
}
