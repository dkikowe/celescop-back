/*
  Warnings:

  - You are about to drop the column `completed` on the `SubGoal` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `SubGoal` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Goal" ALTER COLUMN "createdAt" SET DEFAULT now(),
ALTER COLUMN "updatedAt" SET DEFAULT now();

-- AlterTable
ALTER TABLE "NotificationSettings" ALTER COLUMN "createdAt" SET DEFAULT now(),
ALTER COLUMN "updatedAt" SET DEFAULT now();

-- AlterTable
ALTER TABLE "RefreshToken" ALTER COLUMN "createdAt" SET DEFAULT now(),
ALTER COLUMN "updatedAt" SET DEFAULT now();

-- AlterTable
ALTER TABLE "SubGoal" DROP COLUMN "completed",
DROP COLUMN "order",
ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "createdAt" SET DEFAULT now(),
ALTER COLUMN "updatedAt" SET DEFAULT now();
