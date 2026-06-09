-- ============================================================
-- ShishuCare — Complete Database Schema & Seed Data
-- MySQL 8.0+ compatible
-- ============================================================
-- Run:  mysql -u root -p < prisma/seed.sql
-- Or use the Node seed script:  node prisma/seed.js
-- ============================================================

CREATE DATABASE IF NOT EXISTS shishu_care CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE shishu_care;

-- ===================== USERS =====================
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  full_name_en  VARCHAR(255),
  full_name_bn  VARCHAR(255),
  phone         VARCHAR(20) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE,
  password      VARCHAR(255) NOT NULL,
  role          ENUM('parent', 'health_worker') NOT NULL DEFAULT 'parent',
  avatar_url    VARCHAR(500),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===================== LOCATIONS =====================
CREATE TABLE IF NOT EXISTS divisions (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  name_en  VARCHAR(100) NOT NULL,
  name_bn  VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS districts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  division_id  INT NOT NULL,
  name_en      VARCHAR(100) NOT NULL,
  name_bn      VARCHAR(150) NOT NULL,
  FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS upazilas (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  district_id  INT NOT NULL,
  name_en      VARCHAR(100) NOT NULL,
  name_bn      VARCHAR(150) NOT NULL,
  is_urban     BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE
);

-- ===================== CHILDREN =====================
CREATE TABLE IF NOT EXISTS children (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  parent_id        INT NOT NULL,
  name             VARCHAR(255) NOT NULL,
  date_of_birth    DATE NOT NULL,
  gender           ENUM('male', 'female', 'other') DEFAULT 'male',
  blood_group      VARCHAR(5),
  birth_weight_kg  DECIMAL(5,2),
  birth_height_cm  DECIMAL(5,2),
  journey_type     ENUM('prenatal', 'postnatal') NOT NULL DEFAULT 'postnatal',
  photo_url        VARCHAR(500),
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===================== FEEDING LOGS =====================
CREATE TABLE IF NOT EXISTS feeding_logs (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  child_id          INT NOT NULL,
  type              ENUM('breastfeed', 'bottle', 'solid') NOT NULL,
  duration_minutes  INT,
  amount_ml         DECIMAL(6,2),
  side              ENUM('left', 'right', 'both'),
  food_item         VARCHAR(255),
  notes             TEXT,
  logged_at         DATETIME NOT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ===================== SLEEP LOGS =====================
CREATE TABLE IF NOT EXISTS sleep_logs (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  child_id          INT NOT NULL,
  sleep_start       DATETIME NOT NULL,
  sleep_end         DATETIME,
  duration_minutes  INT,
  quality           ENUM('poor', 'fair', 'good', 'excellent') DEFAULT 'good',
  notes             TEXT,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ===================== GROWTH RECORDS =====================
CREATE TABLE IF NOT EXISTS growth_records (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  child_id                INT NOT NULL,
  weight_kg               DECIMAL(5,2),
  height_cm               DECIMAL(5,2),
  head_circumference_cm   DECIMAL(5,2),
  measured_at             DATE NOT NULL,
  recorded_by             INT,
  notes                   TEXT,
  created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===================== VACCINATIONS (master list) =====================
CREATE TABLE IF NOT EXISTS vaccinations (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  name                  VARCHAR(255) NOT NULL,
  short_name            VARCHAR(50),
  recommended_age_weeks INT,
  description           TEXT,
  is_mandatory          BOOLEAN DEFAULT TRUE,
  doses_required        INT DEFAULT 1
);

-- ===================== VACCINATION RECORDS (per child) =====================
CREATE TABLE IF NOT EXISTS vaccination_records (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  child_id         INT NOT NULL,
  vaccination_id   INT NOT NULL,
  status           ENUM('pending', 'done', 'skipped', 'overdue') DEFAULT 'pending',
  dose_number      INT DEFAULT 1,
  administered_at  DATE,
  next_due_at      DATE,
  administered_by  INT,
  notes            TEXT,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (vaccination_id) REFERENCES vaccinations(id),
  FOREIGN KEY (administered_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===================== MILESTONES (master list) =====================
CREATE TABLE IF NOT EXISTS milestones (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  label        VARCHAR(255) NOT NULL,
  age_months   INT NOT NULL,
  category     ENUM('motor', 'cognitive', 'social', 'language') DEFAULT 'motor',
  description  TEXT,
  icon         VARCHAR(50)
);

-- ===================== MILESTONE RECORDS (per child) =====================
CREATE TABLE IF NOT EXISTS milestone_records (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  child_id      INT NOT NULL,
  milestone_id  INT NOT NULL,
  achieved      BOOLEAN DEFAULT FALSE,
  achieved_at   DATE,
  notes         TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (milestone_id) REFERENCES milestones(id)
);

-- ===================== CARE CHECKLISTS =====================
CREATE TABLE IF NOT EXISTS care_logs (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  child_id       INT NOT NULL,
  label          VARCHAR(255) NOT NULL,
  done           BOOLEAN DEFAULT FALSE,
  scheduled_time TIME,
  completed_at   DATETIME,
  log_date       DATE NOT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ===================== AI QUERIES =====================
CREATE TABLE IF NOT EXISTS ai_queries (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  child_id      INT,
  query_text    TEXT NOT NULL,
  response_text TEXT,
  query_type    ENUM('general', 'risk_check', 'milestone', 'vaccination', 'nutrition') DEFAULT 'general',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE SET NULL
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Bangladesh divisions
INSERT INTO divisions (name_en, name_bn) VALUES
  ('Dhaka', 'ঢাকা'),
  ('Chittagong', 'চট্টগ্রাম'),
  ('Rajshahi', 'রাজশাহী'),
  ('Khulna', 'খুলনা'),
  ('Barisal', 'বরিশাল'),
  ('Sylhet', 'সিলেট'),
  ('Rangpur', 'রংপুর'),
  ('Mymensingh', 'ময়মনসিংহ');

-- Sample districts for Dhaka
INSERT INTO districts (division_id, name_en, name_bn) VALUES
  (1, 'Dhaka', 'ঢাকা'), (1, 'Gazipur', 'গাজীপুর'), (1, 'Narayanganj', 'নারায়ণগঞ্জ'),
  (1, 'Narsingdi', 'নরসিংদী'), (1, 'Manikganj', 'মানিকগঞ্জ');

-- Standard Bangladesh EPI vaccinations
INSERT INTO vaccinations (name, short_name, recommended_age_weeks, description, is_mandatory, doses_required) VALUES
  ('BCG (Bacillus Calmette-Guérin)', 'BCG', 0, 'Protection against tuberculosis. Given at birth.', TRUE, 1),
  ('Polio OPV (Oral Polio Vaccine)', 'OPV', 0, 'Protection against poliomyelitis. First dose at birth.', TRUE, 4),
  ('Pentavalent Vaccine', 'Penta', 6, 'DPT + HepB + Hib combination vaccine.', TRUE, 3),
  ('Pneumococcal Conjugate Vaccine', 'PCV', 6, 'Protection against pneumococcal disease.', TRUE, 3),
  ('Measles & Rubella Vaccine', 'MR', 36, 'Protection against measles and rubella. At 9 months.', TRUE, 2),
  ('MMR Vaccine', 'MMR', 52, 'Measles, Mumps, Rubella. At 12–15 months.', TRUE, 1),
  ('Varicella Vaccine', 'Varicella', 52, 'Chickenpox protection.', FALSE, 2),
  ('Hepatitis B', 'HepB', 0, 'Given at birth for hepatitis B protection.', TRUE, 3),
  ('Rotavirus Vaccine', 'RV', 6, 'Protection against rotavirus diarrhea.', TRUE, 2);

-- Standard developmental milestones
INSERT INTO milestones (label, age_months, category, description) VALUES
  ('Holds head up', 2, 'motor', 'Can hold head steady while on tummy'),
  ('Smiles responsively', 2, 'social', 'Smiles back when you smile'),
  ('Follows moving objects', 2, 'cognitive', 'Tracks moving objects with eyes'),
  ('Coos and makes sounds', 2, 'language', 'Makes gurgling and cooing sounds'),
  ('Rolls over', 4, 'motor', 'Can roll from tummy to back'),
  ('Reaches for objects', 4, 'motor', 'Reaches and grabs for nearby objects'),
  ('Laughs out loud', 4, 'social', 'Laughs and giggles'),
  ('Sits with support', 6, 'motor', 'Can sit upright when supported'),
  ('Responds to name', 6, 'social', 'Turns head when name is called'),
  ('Starts crawling', 9, 'motor', 'Crawls on hands and knees'),
  ('Stands with support', 10, 'motor', 'Pulls to stand using furniture'),
  ('First words', 12, 'language', 'Says "mama" or "dada" with meaning'),
  ('Walks with support', 12, 'motor', 'Takes steps while holding hands'),
  ('Points to objects', 12, 'cognitive', 'Points at things of interest'),
  ('Walks independently', 15, 'motor', 'Takes first independent steps');

-- ============================================================
-- TEST ACCOUNTS
-- ============================================================
-- IMPORTANT: These hashes are for password "password123" (bcrypt, 10 rounds)
-- For production, run:  node prisma/seed.js
--
-- LOGIN CREDENTIALS:
--   Parent    → Phone: 01712345678  Password: password123
--   HW Doctor → Phone: 01812345678  Password: worker123
-- ============================================================

INSERT INTO users (full_name_en, full_name_bn, phone, email, password, role) VALUES
  (
    'Sarah Ahmed',
    'সারাহ আহমেদ',
    '01712345678',
    'sarah@shishucare.app',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkMH6T.4XXi',
    'parent'
  ),
  (
    'Dr. Karim Rahman',
    'ডা. করিম রহমান',
    '01812345678',
    'karim@shishucare.app',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkMH6T.4XXi',
    'health_worker'
  );

-- Child profile for Sarah (user id = 1)
INSERT INTO children (parent_id, name, date_of_birth, gender, blood_group, birth_weight_kg, birth_height_cm, journey_type)
VALUES (1, 'Aayan', '2025-10-09', 'male', 'B+', 3.20, 50.0, 'postnatal');

-- Growth record
INSERT INTO growth_records (child_id, weight_kg, height_cm, head_circumference_cm, measured_at)
VALUES (1, 8.2, 68.0, 43.0, '2026-06-01');

-- Vaccination records
INSERT INTO vaccination_records (child_id, vaccination_id, status, administered_at) VALUES
  (1, 1, 'done', '2025-10-09'),
  (1, 8, 'done', '2025-10-09'),
  (1, 2, 'done', '2025-10-09'),
  (1, 3, 'done', '2025-11-20'),
  (1, 4, 'done', '2025-11-20'),
  (1, 5, 'pending', NULL);

-- Milestone records
INSERT INTO milestone_records (child_id, milestone_id, achieved, achieved_at) VALUES
  (1, 1, TRUE, '2025-12-10'), (1, 2, TRUE, '2025-12-15'), (1, 3, TRUE, '2025-12-20'),
  (1, 4, TRUE, '2025-12-10'), (1, 5, TRUE, '2026-02-15'), (1, 6, TRUE, '2026-02-20'),
  (1, 7, TRUE, '2026-02-25'), (1, 8, TRUE, '2026-04-10'), (1, 9, TRUE, '2026-04-15'),
  (1, 10, FALSE, NULL),        (1, 11, FALSE, NULL);

-- Today's care checklist
INSERT INTO care_logs (child_id, label, done, scheduled_time, log_date) VALUES
  (1, 'Morning Feeding',  TRUE,  '07:30:00', CURDATE()),
  (1, 'Vitamin D Drops',  TRUE,  '08:00:00', CURDATE()),
  (1, 'Tummy Time',       FALSE, '10:00:00', CURDATE()),
  (1, 'Afternoon Nap',    FALSE, '14:00:00', CURDATE());

-- Feeding logs
INSERT INTO feeding_logs (child_id, type, duration_minutes, side, logged_at) VALUES
  (1, 'breastfeed', 15, 'left',  CONCAT(CURDATE(), ' 07:30:00')),
  (1, 'breastfeed', 12, 'right', CONCAT(CURDATE(), ' 10:45:00'));
INSERT INTO feeding_logs (child_id, type, amount_ml, logged_at) VALUES
  (1, 'bottle', 120, CONCAT(CURDATE(), ' 13:30:00'));

-- Sleep logs
INSERT INTO sleep_logs (child_id, sleep_start, sleep_end, duration_minutes) VALUES
  (1, CONCAT(CURDATE(), ' 09:15:00'), CONCAT(CURDATE(), ' 10:30:00'), 75),
  (1, CONCAT(CURDATE(), ' 14:00:00'), CONCAT(CURDATE(), ' 16:00:00'), 120);
