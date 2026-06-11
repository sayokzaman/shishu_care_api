/*
  Warnings:

  - You are about to drop the column `vaccine_id` on the `child_vaccinations` table. All the data in the column will be lost.
  - Added the required column `vaccine_dose_id` to the `child_vaccinations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `child_vaccinations` DROP FOREIGN KEY `child_vaccinations_vaccine_id_fkey`;

-- DropIndex
DROP INDEX `child_vaccinations_vaccine_id_fkey` ON `child_vaccinations`;

-- AlterTable
ALTER TABLE `child_vaccinations` DROP COLUMN `vaccine_id`,
    ADD COLUMN `vaccine_dose_id` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `vaccine_doses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vaccine_id` INTEGER NOT NULL,
    `dose_number` INTEGER NOT NULL,
    `name_en` VARCHAR(191) NOT NULL,
    `name_bn` VARCHAR(191) NOT NULL,
    `eligible_age_days` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vaccine_doses` ADD CONSTRAINT `vaccine_doses_vaccine_id_fkey` FOREIGN KEY (`vaccine_id`) REFERENCES `vaccines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `child_vaccinations` ADD CONSTRAINT `child_vaccinations_vaccine_dose_id_fkey` FOREIGN KEY (`vaccine_dose_id`) REFERENCES `vaccine_doses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
