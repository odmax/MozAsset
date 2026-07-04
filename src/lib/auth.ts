import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { normalizeEmail } from '@/lib/email-normalize';
import type { Role, Plan } from '@prisma/client';

const AUTH_SECRET = process.env.AUTH_SECRET || 'fallback-secret-change-in-production';

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
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      async profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: 'EMPLOYEE' as Role,
          plan: 'FREE' as Plan,
          assetLimit: 50,
          onBoardingComplete: false,
        };
      },
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) throw new Error('Email and password required');
          const email = normalizeEmail(credentials.email as string);
          const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: { id: true, email: true, password: true, name: true, role: true, plan: true, assetLimit: true, onBoardingComplete: true, isActive: true },
          });
          if (!user || !user.password || !user.isActive) throw new Error('Invalid credentials');
          if (!await bcrypt.compare(credentials.password as string, user.password)) throw new Error('Invalid credentials');
          return { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan, assetLimit: user.assetLimit, onBoardingComplete: user.onBoardingComplete };
        } catch { return null; }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = normalizeEmail(user.email || '');
        if (!email) return false;

        const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

        if (existing) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { emailVerified: new Date(), emailVerifiedAt: new Date(), emailVerificationToken: null, verificationTokenExpiry: null, authProvider: existing.authProvider === 'GOOGLE' ? 'GOOGLE' : 'BOTH' },
          });
          user.id = existing.id;
          user.role = existing.role;
          user.plan = existing.plan;
          user.assetLimit = existing.assetLimit;
          user.onBoardingComplete = existing.onBoardingComplete;
          user.name = existing.name;
          await prisma.auditLog.create({ data: { action: 'EMAIL_VERIFIED' as any, entityType: 'User', entityId: existing.id, userId: existing.id, changes: { method: 'GOOGLE_LOGIN' } } }).catch(() => {});
        } else {
          const newUser = await prisma.user.create({
            data: { email, name: user.name, role: 'EMPLOYEE', plan: 'FREE', assetLimit: 50, isActive: true, emailVerified: new Date(), emailVerifiedAt: new Date(), authProvider: 'GOOGLE' },
          });
          const org = await prisma.organization.create({ data: { name: user.name || email, ownerId: newUser.id } });
          await prisma.user.update({ where: { id: newUser.id }, data: { organizationId: org.id } });
          user.id = newUser.id;
          user.role = newUser.role;
          user.plan = newUser.plan;
          await prisma.auditLog.create({ data: { action: 'CREATE' as any, entityType: 'User', entityId: newUser.id, userId: newUser.id, changes: { action: 'GOOGLE_SIGNUP' } } }).catch(() => {});
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.plan = (user as any).plan;
        token.assetLimit = (user as any).assetLimit;
        token.onBoardingComplete = (user as any).onBoardingComplete;
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
