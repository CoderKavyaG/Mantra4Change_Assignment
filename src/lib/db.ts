import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const dbPath = path.resolve(process.cwd(), "dev.db").replace(/\\/g, "/");
console.log("Database absolute path:", dbPath);
const adapter = new PrismaBetterSqlite3({
  url: `file:${dbPath}`
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
