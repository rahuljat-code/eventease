import { PrismaClient } from "@prisma/client";

// A single shared Prisma client for the whole app.
//
// On serverless (Vercel) the module can be reused across warm invocations, so we
// cache the client on globalThis. Without this, every cold/warm start could open
// a fresh pool of DB connections and exhaust Supabase's limit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

globalForPrisma.prisma = prisma;
