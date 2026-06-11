-- CreateTable
CREATE TABLE `divisions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name_bn` VARCHAR(191) NOT NULL,
    `name_en` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `districts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `division_id` INTEGER NOT NULL,
    `name_bn` VARCHAR(191) NOT NULL,
    `name_en` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `upazilas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `district_id` INTEGER NOT NULL,
    `name_bn` VARCHAR(191) NOT NULL,
    `name_en` VARCHAR(191) NOT NULL,
    `is_urban` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(191) NOT NULL,
    `full_name_bn` VARCHAR(191) NOT NULL,
    `full_name_en` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('admin', 'parent', 'health_worker') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `is_pregnant` BOOLEAN NOT NULL DEFAULT false,
    `date_of_birth` DATETIME(3) NULL,
    `pregnancy_duration` INTEGER NULL,
    `weight` DOUBLE NULL,
    `upazilla_id` INTEGER NOT NULL,
    `district_id` INTEGER NOT NULL,
    `division_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `parents_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `health_workers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `upazilla_id` INTEGER NOT NULL,
    `district_id` INTEGER NOT NULL,
    `division_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `health_workers_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `children` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parent_id` INTEGER NOT NULL,
    `full_name_bn` VARCHAR(191) NOT NULL,
    `full_name_en` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NOT NULL,
    `expected_delivery_date` DATETIME(3) NULL,
    `date_of_birth` DATETIME(3) NULL,
    `blood_group` VARCHAR(191) NULL,
    `birth_location` VARCHAR(191) NULL,
    `mother_age_at_edd` INTEGER NULL,
    `pregnancy_complications` TEXT NULL,
    `is_breastfed` BOOLEAN NOT NULL DEFAULT false,
    `birth_complications` TEXT NULL,
    `upazilla_id` INTEGER NOT NULL,
    `district_id` INTEGER NOT NULL,
    `division_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `growth_measurements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `child_id` INTEGER NOT NULL,
    `measured_by` INTEGER NOT NULL,
    `measured_at` DATETIME(3) NOT NULL,
    `age_days` INTEGER NOT NULL,
    `weight_kg` DOUBLE NOT NULL,
    `height_cm` DOUBLE NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `illness_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `child_id` INTEGER NOT NULL,
    `recorded_by` INTEGER NOT NULL,
    `recorded_at` DATETIME(3) NOT NULL,
    `disease` VARCHAR(191) NOT NULL,
    `symptoms` TEXT NULL,
    `treatment_given` TEXT NULL,
    `doctor_name` VARCHAR(191) NULL,
    `facility_name` VARCHAR(191) NULL,
    `resolved` BOOLEAN NOT NULL DEFAULT false,
    `resolved_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vaccines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name_en` VARCHAR(191) NOT NULL,
    `name_bn` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `child_vaccinations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `child_id` INTEGER NOT NULL,
    `vaccine_id` INTEGER NOT NULL,
    `scheduled_date` DATETIME(3) NOT NULL,
    `given_date` DATETIME(3) NULL,
    `facility_name` VARCHAR(191) NULL,
    `is_given` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `districts` ADD CONSTRAINT `districts_division_id_fkey` FOREIGN KEY (`division_id`) REFERENCES `divisions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `upazilas` ADD CONSTRAINT `upazilas_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parents` ADD CONSTRAINT `parents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parents` ADD CONSTRAINT `parents_upazilla_id_fkey` FOREIGN KEY (`upazilla_id`) REFERENCES `upazilas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parents` ADD CONSTRAINT `parents_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parents` ADD CONSTRAINT `parents_division_id_fkey` FOREIGN KEY (`division_id`) REFERENCES `divisions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `health_workers` ADD CONSTRAINT `health_workers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `health_workers` ADD CONSTRAINT `health_workers_upazilla_id_fkey` FOREIGN KEY (`upazilla_id`) REFERENCES `upazilas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `health_workers` ADD CONSTRAINT `health_workers_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `health_workers` ADD CONSTRAINT `health_workers_division_id_fkey` FOREIGN KEY (`division_id`) REFERENCES `divisions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `children` ADD CONSTRAINT `children_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `parents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `children` ADD CONSTRAINT `children_upazilla_id_fkey` FOREIGN KEY (`upazilla_id`) REFERENCES `upazilas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `children` ADD CONSTRAINT `children_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `children` ADD CONSTRAINT `children_division_id_fkey` FOREIGN KEY (`division_id`) REFERENCES `divisions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `growth_measurements` ADD CONSTRAINT `growth_measurements_child_id_fkey` FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `growth_measurements` ADD CONSTRAINT `growth_measurements_measured_by_fkey` FOREIGN KEY (`measured_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `illness_records` ADD CONSTRAINT `illness_records_child_id_fkey` FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `illness_records` ADD CONSTRAINT `illness_records_recorded_by_fkey` FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `child_vaccinations` ADD CONSTRAINT `child_vaccinations_child_id_fkey` FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `child_vaccinations` ADD CONSTRAINT `child_vaccinations_vaccine_id_fkey` FOREIGN KEY (`vaccine_id`) REFERENCES `vaccines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
