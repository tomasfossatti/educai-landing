import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __educaiPrisma: PrismaClient | undefined;
}

export const db = global.__educaiPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global.__educaiPrisma = db;

function isTransientConnectionError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String((error as { code?: unknown }).code ?? "");
  return code === "P1017" || code === "P1001" || code === "P1002";
}

export async function withDbRetry<T>(operation: () => Promise<T>, retries = 1): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientConnectionError(error) || attempt >= retries) throw error;
      attempt += 1;
      try { await db.$disconnect(); } catch {}
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }
}
