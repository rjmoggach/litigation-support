import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      accessToken?: string
      refreshToken?: string
      is_verified?: boolean
      is_superuser?: boolean
      is_active?: boolean
      roles?: string[]
      full_name?: string | null
      avatar_url?: string | null
    } & DefaultSession["user"]
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    refreshTokenExpires?: number
  }

  interface User extends DefaultUser {
    id: string
    email: string
    name?: string | null
    image?: string | null
    accessToken?: string
    refreshToken?: string
    is_verified?: boolean
    is_superuser?: boolean
    is_active?: boolean
    roles?: string[]
    full_name?: string | null
    avatar_url?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    refreshTokenExpires?: number
    user?: Record<string, unknown>
    is_verified?: boolean
    is_superuser?: boolean
    is_active?: boolean
    roles?: string[]
  }
}