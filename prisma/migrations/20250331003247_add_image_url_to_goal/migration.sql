/*
  Warnings:

  - The primary key for the `NotificationSettings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `NotificationSettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[id]` on the table `NotificationSettings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "imageUrl" TEXT DEFAULT 'https://celiscope.ru/placeholder-image.jpg',
ALTER COLUMN "createdAt" SET DEFAULT now(),
ALTER COLUMN "updatedAt" SET DEFAULT now();

-- AlterTable
ALTER TABLE "NotificationSettings" DROP CONSTRAINT "NotificationSettings_pkey",
ADD COLUMN     "monthlyGoalDeadlineNotificationsTime" TEXT NOT NULL DEFAULT '09:00',
ADD COLUMN     "todaySubGoalsNotificationsTime" TEXT NOT NULL DEFAULT '09:00',
ADD COLUMN     "tomorrowSubGoalNotificationsTime" TEXT NOT NULL DEFAULT '09:00',
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "createdAt" SET DEFAULT now(),
ALTER COLUMN "updatedAt" SET DEFAULT now(),
ADD CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "createdAt" SET DEFAULT now(),
ALTER COLUMN "updatedAt" SET DEFAULT now();

-- AlterTable
ALTER TABLE "SubGoal" ADD COLUMN     "completedAt" TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DEFAULT now(),
ALTER COLUMN "updatedAt" SET DEFAULT now();

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "createdAt" SET DEFAULT now(),
ALTER COLUMN "updatedAt" SET DEFAULT now();

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSettings_id_key" ON "NotificationSettings"("id");
