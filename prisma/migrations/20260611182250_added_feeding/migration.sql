-- CreateTable
CREATE TABLE `feeding_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `child_id` INTEGER NOT NULL,
    `logged_by` INTEGER NOT NULL,
    `fed_at` DATETIME(3) NOT NULL,
    `method` ENUM('breastfed', 'bottle_breast_milk', 'bottle_formula', 'spoon_fed', 'cup_fed', 'self_fed', 'tube_fed', 'mixed') NOT NULL,
    `breast_side` ENUM('left', 'right', 'both') NULL,
    `duration_minutes` INTEGER NULL,
    `amount_ml` DOUBLE NULL,
    `mood` VARCHAR(191) NULL,
    `appetite` ENUM('easy', 'moderate', 'difficult', 'refused') NULL,
    `vomited_after` BOOLEAN NOT NULL DEFAULT false,
    `choked` BOOLEAN NOT NULL DEFAULT false,
    `allergic_reaction` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feeding_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `food_name_bn` VARCHAR(191) NOT NULL,
    `food_name_en` VARCHAR(191) NULL,
    `category` ENUM('breast_milk', 'formula', 'water', 'juice', 'grains_cereals', 'legumes', 'fish', 'meat_poultry', 'egg', 'vegetables', 'fruits', 'dairy', 'mixed_meal', 'commercial_baby_food', 'snack', 'other') NOT NULL,
    `consistency` ENUM('liquid', 'puree', 'mashed', 'minced', 'soft_pieces', 'regular') NULL,
    `amount_grams` DOUBLE NULL,
    `amount_ml` DOUBLE NULL,
    `amount_description` VARCHAR(191) NULL,
    `is_new_food` BOOLEAN NOT NULL DEFAULT false,
    `accepted` BOOLEAN NULL,
    `reaction` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `feeding_sessions` ADD CONSTRAINT `feeding_sessions_child_id_fkey` FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feeding_sessions` ADD CONSTRAINT `feeding_sessions_logged_by_fkey` FOREIGN KEY (`logged_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feeding_items` ADD CONSTRAINT `feeding_items_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `feeding_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
