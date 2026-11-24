import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth/next'
import { passwordVersion } from '@/lib/client-auth'


export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: String(credentials.email)
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password as string
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          pwv: passwordVersion(user.password),
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.pwv = user.pwv;
        return token;
      }
      // Senha trocada depois do login (ex.: "Esqueci a senha"): a sessão perde
      // id e role e o painel nega acesso.
      if (token?.id) {
        const current = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { password: true, isActive: true },
        });
        if (!current || !current.isActive) return {};
        const version = passwordVersion(current.password);
        // Sessão de antes desta versão (sem pwv): recebe a impressão da senha atual,
        // para que uma troca de senha futura também a derrube.
        if (!token.pwv) {
          token.pwv = version;
        } else if (token.pwv !== version) {
          return {};
        }
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
}

export default NextAuth(authOptions)
