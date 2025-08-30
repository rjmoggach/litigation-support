import NextAuth from 'next-auth'
import { config } from '@/lib/auth'

export const { handlers, auth, signIn, signOut } = NextAuth(config)