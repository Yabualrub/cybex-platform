import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const dbInfo = await prisma.$queryRawUnsafe<any[]>(`
    select current_database() as db,
           current_schema() as schema,
           inet_server_addr() as server_addr,
           inet_server_port() as server_port
  `);

  const cols = await prisma.$queryRawUnsafe<any[]>(`
    select column_name
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'agent_conversations'
    order by ordinal_position
  `);

  console.log('DB_INFO:', dbInfo?.[0]);
  console.log('AGENT_CONVERSATIONS_COLUMNS:', cols.map(c => c.column_name));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
