-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('HEAD', 'SUBHEAD');

-- AlterTable: add the new position column first so we can backfill it.
ALTER TABLE "User" ADD COLUMN     "teamRole" "TeamRole";

-- Backfill: every existing single head becomes a HEAD leader of their team,
-- so no current head assignment is lost when headId is dropped.
UPDATE "User" AS u
SET "teamRole" = 'HEAD'
FROM "Team" AS t
WHERE t."headId" = u."id";

-- DropForeignKey + drop the old single-head column (leaders now live on User).
ALTER TABLE "Team" DROP CONSTRAINT "Team_headId_fkey";
ALTER TABLE "Team" DROP COLUMN "headId";
