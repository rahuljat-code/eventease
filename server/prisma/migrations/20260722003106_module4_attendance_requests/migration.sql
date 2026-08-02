-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING_TEAM_HEAD', 'PENDING_PRESIDENT', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AttendanceRequest" (
    "id" SERIAL NOT NULL,
    "volunteerId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "lectureDate" TIMESTAMP(3) NOT NULL,
    "lectureTime" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL,
    "reason" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING_TEAM_HEAD',
    "headActionById" INTEGER,
    "headActionAt" TIMESTAMP(3),
    "headRemark" TEXT,
    "presidentActionById" INTEGER,
    "presidentActionAt" TIMESTAMP(3),
    "presidentRemark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRequest_volunteerId_subjectId_lectureDate_key" ON "AttendanceRequest"("volunteerId", "subjectId", "lectureDate");

-- AddForeignKey
ALTER TABLE "AttendanceRequest" ADD CONSTRAINT "AttendanceRequest_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRequest" ADD CONSTRAINT "AttendanceRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRequest" ADD CONSTRAINT "AttendanceRequest_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRequest" ADD CONSTRAINT "AttendanceRequest_headActionById_fkey" FOREIGN KEY ("headActionById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRequest" ADD CONSTRAINT "AttendanceRequest_presidentActionById_fkey" FOREIGN KEY ("presidentActionById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

