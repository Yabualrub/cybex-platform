const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(
    rows.map(r => ({
      action: r.action,
      tenantId: r.tenantId,
      userId: r.userId,
      entityType: r.entityType,
      entityId: r.entityId,
      createdAt: r.createdAt,
    }))
  );

  await prisma.$disconnect();
}

run().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
