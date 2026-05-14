import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import { getDatabaseUrl, getSeedSysAdminPassword } from "../src/lib/env";
import { hashPassword } from "../src/lib/password";
import { SESSION_IDLE_TIMEOUT_KEY } from "../src/lib/session-policy";
import { PASSWORD_MESSAGE, PASSWORD_PATTERN } from "../src/lib/validation";

const connectionString = getDatabaseUrl();
const sysAdminPassword = getSeedSysAdminPassword();

if (
  sysAdminPassword.length < 8 ||
  sysAdminPassword.length > 128 ||
  !PASSWORD_PATTERN.test(sysAdminPassword)
) {
  throw new Error(`SEED_SYS_ADMIN_PASSWORD: ${PASSWORD_MESSAGE}`);
}

const seedSysAdminPassword = sysAdminPassword;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const passwordHash = await hashPassword(seedSysAdminPassword);

  await prisma.user.updateMany({
    where: {
      username: { not: "sys_admin" },
      role: Role.SUPER_ADMIN,
    },
    data: { role: Role.ADMIN },
  });

  await prisma.user.upsert({
    where: { username: "sys_admin" },
    update: {
      isActive: true,
      mustChangePassword: true,
      passwordHash,
      role: Role.SUPER_ADMIN,
    },
    create: {
      username: "sys_admin",
      passwordHash,
      isActive: true,
      mustChangePassword: true,
      role: Role.SUPER_ADMIN,
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: SESSION_IDLE_TIMEOUT_KEY },
    update: {},
    create: {
      key: SESSION_IDLE_TIMEOUT_KEY,
      value: "30",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
