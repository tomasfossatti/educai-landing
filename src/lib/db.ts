import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __educaiPrisma: PrismaClient | undefined;
}

export const db = global.__educaiPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global.__educaiPrisma = db;
