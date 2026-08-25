import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // Repair seeded credential accounts: better-auth expects
  //   accountId = userId   AND   issuer = "local:credential"
  const fixed = await prisma.$executeRawUnsafe(
    `UPDATE "account"
     SET "accountId" = "userId", "issuer" = 'local:credential'
     WHERE "providerId" = 'credential'
       AND ("accountId" <> "userId" OR "issuer" <> 'local:credential')`,
  );
  console.log(`repaired ${fixed} credential account(s)`);

  // Remove the probe signup and any synthetic debug session.
  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { in: ["probe@safarino.local"] } },
  });
  const deletedSessions = await prisma.session.deleteMany({
    where: { token: "debugtesttoken123" },
  });
  console.log(
    `removed ${deletedUsers.count} probe user(s), ${deletedSessions.count} debug session(s)`,
  );

  await prisma.$disconnect();
}

void main();
