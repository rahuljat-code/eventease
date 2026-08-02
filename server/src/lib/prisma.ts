import { PrismaClient } from "@prisma/client";

// A single shared Prisma client for the whole app.
// (Creating a new PrismaClient on every request would open too many DB connections.)
export const prisma = new PrismaClient();
