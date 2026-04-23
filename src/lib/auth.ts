import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import type { Role, Plan } from '@prisma/client';

const AUTH_SECRET = process.env.AUTH_SECRET || 'fallback-secret-change-in-production';
const AUTH_URL = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3070';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      plan: Plan;
      assetLimit: number;
      onBoardingComplete: boolean;
    };
  }

  interface User {
    role: Role;
    plan: Plan;
    assetLimit: number;
    onBoardingComplete: boolean;
  }

  interface JWT {
    id: string;
    role: Role;
    plan: Plan;
    assetLimit: number;
    onBoardingComplete: boolean;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      type: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Email and password required');
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.password || !user.isActive) {
            throw new Error('Invalid credentials');
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) {
            throw new Error('Invalid credentials');
          }
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            plan: user.plan,
            assetLimit: user.assetLimit,
            onBoardingComplete: user.onBoardingComplete,
          };
        } catch (error) {
          console.error('Auth authorize error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.plan = (user as { plan: Plan }).plan;
        token.assetLimit = (user as { assetLimit: number }).assetLimit;
        token.onBoardingComplete = (user as { onBoardingComplete: boolean }).onBoardingComplete;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.plan = (token.plan as Plan) || 'FREE';
        session.user.assetLimit = (token.assetLimit as number) || 50;
        session.user.onBoardingComplete = (token.onBoardingComplete as boolean) || false;
      }
      return session;
    },
  },
});