import "server-only";

import bcrypt from "bcrypt";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";

import { ensureDefaultUsers } from "@/lib/default-users";
import { prisma } from "@/lib/prisma";
import { UserRole, type User } from "@/src/generated/prisma";

type AuthenticatedUser = Pick<User, "id" | "name" | "email" | "role">;

export const authOptions: NextAuthOptions = {
  secret:
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "dev-only-secret-change-me",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Identifier", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await ensureDefaultUsers();

        const identifier = credentials?.identifier?.trim();
        const password = credentials?.password;

        if (!identifier || !password) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              {
                email: {
                  equals: identifier,
                  mode: "insensitive",
                },
              },
              {
                name: {
                  equals: identifier,
                  mode: "insensitive",
                },
              },
            ],
          },
        });

        if (!user) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as AuthenticatedUser).role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as UserRole;
      }

      return session;
    },
  },
};

export async function getAuthSession() {
  await ensureDefaultUsers();
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getAuthSession();

  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== UserRole.ADMIN) {
    redirect("/delivery/orders");
  }

  return user;
}

export async function requireDeliveryUser() {
  const user = await requireUser();

  if (user.role !== UserRole.DELIVERY) {
    redirect("/admin/dashboard");
  }

  return user;
}

export function isAdminRole(role: UserRole) {
  return role === UserRole.ADMIN;
}
