-- AlterTable
ALTER TABLE `user` ADD COLUMN `assignedCategoryId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_assignedCategoryId_fkey` FOREIGN KEY (`assignedCategoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
