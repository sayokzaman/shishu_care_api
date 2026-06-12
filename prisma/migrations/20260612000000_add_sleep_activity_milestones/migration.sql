-- AlterTable: add nullable head_circumference_cm to growth_measurements
ALTER TABLE `growth_measurements` ADD COLUMN `head_circumference_cm` DOUBLE NULL;

-- CreateTable: sleep_sessions
CREATE TABLE `sleep_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `child_id` INTEGER NOT NULL,
    `logged_by` INTEGER NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `ended_at` DATETIME(3) NULL,
    `type` ENUM('nap', 'night', 'rest') NOT NULL,
    `quality` ENUM('good', 'fair', 'poor') NULL,
    `location` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: activity_sessions
CREATE TABLE `activity_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `child_id` INTEGER NOT NULL,
    `logged_by` INTEGER NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `duration_minutes` INTEGER NULL,
    `type` ENUM('tummy_time', 'play', 'bath', 'outdoor', 'reading', 'massage', 'music', 'other') NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: milestones
CREATE TABLE `milestones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `age_bracket` VARCHAR(191) NOT NULL,
    `domain` ENUM('motor', 'language', 'social', 'cognitive', 'health') NOT NULL,
    `text_en` TEXT NOT NULL,
    `text_bn` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `source` VARCHAR(191) NULL,
    `min_age_months` INTEGER NULL,
    `max_age_months` INTEGER NULL,
    `is_key` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: child_milestones
CREATE TABLE `child_milestones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `child_id` INTEGER NOT NULL,
    `milestone_id` INTEGER NOT NULL,
    `is_achieved` BOOLEAN NOT NULL DEFAULT false,
    `achieved_at` DATETIME(3) NULL,
    `checked_by` INTEGER NULL,
    `notes` TEXT NULL,
    `flagged` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `child_milestones_child_id_milestone_id_key`(`child_id`, `milestone_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sleep_sessions` ADD CONSTRAINT `sleep_sessions_child_id_fkey` FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sleep_sessions` ADD CONSTRAINT `sleep_sessions_logged_by_fkey` FOREIGN KEY (`logged_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_sessions` ADD CONSTRAINT `activity_sessions_child_id_fkey` FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_sessions` ADD CONSTRAINT `activity_sessions_logged_by_fkey` FOREIGN KEY (`logged_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `child_milestones` ADD CONSTRAINT `child_milestones_child_id_fkey` FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `child_milestones` ADD CONSTRAINT `child_milestones_milestone_id_fkey` FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `child_milestones` ADD CONSTRAINT `child_milestones_checked_by_fkey` FOREIGN KEY (`checked_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
