-- CreateTable
CREATE TABLE `parent_health_conditions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parent_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `parent_health_conditions` ADD CONSTRAINT `parent_health_conditions_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `parents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
