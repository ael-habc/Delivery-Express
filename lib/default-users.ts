import "server-only";

import bcrypt from "bcrypt";

import {
  DEFAULT_APP_USERS,
  DEFAULT_LOGIN_PASSWORD,
} from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

let defaultPasswordHashPromise: Promise<string> | null = null;
let ensureDefaultUsersPromise: Promise<void> | null = null;

async function getDefaultPasswordHash(): Promise<string> {
  if (!defaultPasswordHashPromise) {
    defaultPasswordHashPromise = bcrypt.hash(DEFAULT_LOGIN_PASSWORD, 10);
  }

  return defaultPasswordHashPromise!;
}

export async function ensureDefaultUsers() {
  if (!ensureDefaultUsersPromise) {
    ensureDefaultUsersPromise = (async () => {
      const password = await getDefaultPasswordHash();

      await Promise.all(
        DEFAULT_APP_USERS.map(async ({ name, email, role, legacyEmails, legacyNames }) => {
          const matchingUsers = await prisma.user.findMany({
            where: {
              OR: [
                { email },
                { name },
                ...((legacyEmails ?? []).map((legacyEmail) => ({
                  email: legacyEmail,
                })) as Array<{ email: string }>),
                ...((legacyNames ?? []).map((legacyName) => ({
                  name: legacyName,
                })) as Array<{ name: string }>),
              ],
            },
            select: { id: true, email: true },
          });

          const primaryUser =
            matchingUsers.find((user) => user.email === email) ?? matchingUsers[0];

          if (primaryUser) {
            await prisma.$transaction(async (tx) => {
              const duplicateUsers = matchingUsers.filter(
                (user) => user.id !== primaryUser.id
              );

              for (const duplicateUser of duplicateUsers) {
                await tx.order.updateMany({
                  where: { assignedToId: duplicateUser.id },
                  data: { assignedToId: primaryUser.id },
                });

                await tx.orderEvent.updateMany({
                  where: { createdById: duplicateUser.id },
                  data: { createdById: primaryUser.id },
                });

                await tx.user.delete({
                  where: { id: duplicateUser.id },
                });
              }

              await tx.user.update({
                where: { id: primaryUser.id },
                data: {
                  name,
                  email,
                  password,
                  role,
                },
              });
            });

            return;
          }

          await prisma.user.create({
            data: {
              name,
              email,
              password,
              role,
            },
          });
        })
      );
    })().catch((error) => {
      ensureDefaultUsersPromise = null;
      throw error;
    });
  }

  await ensureDefaultUsersPromise;
}
