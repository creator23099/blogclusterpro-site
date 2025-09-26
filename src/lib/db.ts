// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

// keep a single PrismaClient in dev
declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

export const db: PrismaClient =
  global._prisma ??
  new PrismaClient({
    // optional: add logs if you like
    // log: ['warn', 'error'],
  });

if (process.env.NODE_ENV !== "production") {
  global._prisma = db;
}

export default db;