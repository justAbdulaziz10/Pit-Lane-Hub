import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
    // Safe initialization for build time
    // If database URL is missing, we don't want to crash during build
    // unless we are actually trying to query data.
    try {
        return new PrismaClient();
    } catch (e) {
        console.warn("Failed to initialize PrismaClient (likely missing env vars during build). Using mock.");
        return new Proxy({}, {
            get: () => async () => {
                console.warn("Prisma mocked call - no database connection");
                return null;
            }
        });
    }
};

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
