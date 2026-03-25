import { PrismaClient } from "@prisma/client";

async function hashPassword(pw) {
  try {
    const bcrypt = await import("bcrypt");
    return await bcrypt.hash(pw, 10);
  } catch {
    const bcryptjs = await import("bcryptjs");
    return await bcryptjs.hash(pw, 10);
  }
}

async function main() {
  const prisma = new PrismaClient();

  const email = "owner@cybex.local";
  const password = "Password123!";
  const tenantName = "Cybex Tenant";

  const tenant = await prisma.tenant.create({
    data: { name: tenantName },
  });

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      role: "OWNER",
      tenantId: tenant.id,
      fullName: "Owner",
    },
  });

  console.log("✅ SEED DONE");
  console.log("TenantId:", tenant.id);
  console.log("Email:", email);
  console.log("Password:", password);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
