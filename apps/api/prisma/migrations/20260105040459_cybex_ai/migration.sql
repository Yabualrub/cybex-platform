/*
  Warnings:

  - Added the required column `ownerUserId` to the `agent_conversations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "agent_conversations" ADD COLUMN     "languagePreference" TEXT,
ADD COLUMN     "ownerUserId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "agent_conversations_tenantId_ownerUserId_idx" ON "agent_conversations"("tenantId", "ownerUserId");

-- AddForeignKey
ALTER TABLE "agent_conversations" ADD CONSTRAINT "agent_conversations_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
