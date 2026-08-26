-- CreateTable
CREATE TABLE "CCActivity" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "points" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CCActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CCActivityAttendance" (
    "id" SERIAL NOT NULL,
    "activityId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CCActivityAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CCActivityAttendance_activityId_studentId_key" ON "CCActivityAttendance"("activityId", "studentId");

-- AddForeignKey
ALTER TABLE "CCActivity" ADD CONSTRAINT "CCActivity_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CCActivity" ADD CONSTRAINT "CCActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CCActivityAttendance" ADD CONSTRAINT "CCActivityAttendance_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "CCActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CCActivityAttendance" ADD CONSTRAINT "CCActivityAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

