-- CreateTable
CREATE TABLE "CreditAward" (
    "id" SERIAL NOT NULL,
    "volunteerId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "awardedById" INTEGER,
    "verifiedById" INTEGER,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditAward_volunteerId_eventId_key" ON "CreditAward"("volunteerId", "eventId");

-- AddForeignKey
ALTER TABLE "CreditAward" ADD CONSTRAINT "CreditAward_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAward" ADD CONSTRAINT "CreditAward_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAward" ADD CONSTRAINT "CreditAward_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAward" ADD CONSTRAINT "CreditAward_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

