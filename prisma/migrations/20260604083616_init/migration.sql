-- CreateTable
CREATE TABLE "parents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'bn',
    "role" TEXT NOT NULL DEFAULT 'parent',
    "division" TEXT,
    "district" TEXT,
    "upazila" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastSyncAt" DATETIME
);

-- CreateTable
CREATE TABLE "children" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "expectedDueDate" DATETIME,
    "birthWeight" REAL,
    "knownConditions" TEXT,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "children_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vaccination_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "vaccineId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "vaccineNameBn" TEXT NOT NULL,
    "scheduledDate" DATETIME NOT NULL,
    "receivedDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "lotNumber" TEXT,
    "batchId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vaccination_records_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "milestone_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionBn" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "concernNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "milestone_records_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "growth_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "weight" REAL,
    "height" REAL,
    "muac" REAL,
    "muacBand" TEXT,
    "weightForAgeStatus" TEXT,
    "heightForAgeStatus" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "growth_records_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "symptom_checks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "ruleEngineLevel" INTEGER NOT NULL,
    "urgencyLevel" INTEGER NOT NULL,
    "urgencyLabel" TEXT NOT NULL,
    "aiEnhanced" BOOLEAN NOT NULL DEFAULT false,
    "immediateActionEn" TEXT,
    "immediateActionBn" TEXT,
    "bulletPointsEn" TEXT,
    "bulletPointsBn" TEXT,
    "facilityId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "outcomeNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "symptom_checks_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameBn" TEXT,
    "type" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "upazila" TEXT,
    "address" TEXT,
    "addressBn" TEXT,
    "phone" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "beds" INTEGER,
    "oxygenAvailable" BOOLEAN NOT NULL DEFAULT false,
    "pediatricUnit" BOOLEAN NOT NULL DEFAULT false,
    "powerBackup" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "facility_admins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLogin" DATETIME,
    CONSTRAINT "facility_admins_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "division" TEXT,
    "district" TEXT,
    "upazila" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "isModerated" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "community_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "parents" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sms_reminders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "vaccineId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "vaccineNameBn" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "scheduledSendAt" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sms_reminders_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "parents_phone_key" ON "parents"("phone");

-- CreateIndex
CREATE INDEX "parents_phone_idx" ON "parents"("phone");

-- CreateIndex
CREATE INDEX "parents_upazila_idx" ON "parents"("upazila");

-- CreateIndex
CREATE INDEX "children_parentId_idx" ON "children"("parentId");

-- CreateIndex
CREATE INDEX "children_isActive_idx" ON "children"("isActive");

-- CreateIndex
CREATE INDEX "vaccination_records_childId_idx" ON "vaccination_records"("childId");

-- CreateIndex
CREATE INDEX "vaccination_records_status_idx" ON "vaccination_records"("status");

-- CreateIndex
CREATE INDEX "vaccination_records_scheduledDate_idx" ON "vaccination_records"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "vaccination_records_childId_vaccineId_key" ON "vaccination_records"("childId", "vaccineId");

-- CreateIndex
CREATE INDEX "milestone_records_childId_idx" ON "milestone_records"("childId");

-- CreateIndex
CREATE INDEX "milestone_records_ageGroup_idx" ON "milestone_records"("ageGroup");

-- CreateIndex
CREATE INDEX "milestone_records_completed_idx" ON "milestone_records"("completed");

-- CreateIndex
CREATE UNIQUE INDEX "milestone_records_childId_milestoneId_key" ON "milestone_records"("childId", "milestoneId");

-- CreateIndex
CREATE INDEX "growth_records_childId_idx" ON "growth_records"("childId");

-- CreateIndex
CREATE INDEX "growth_records_date_idx" ON "growth_records"("date");

-- CreateIndex
CREATE INDEX "symptom_checks_childId_idx" ON "symptom_checks"("childId");

-- CreateIndex
CREATE INDEX "symptom_checks_urgencyLevel_idx" ON "symptom_checks"("urgencyLevel");

-- CreateIndex
CREATE INDEX "symptom_checks_resolved_idx" ON "symptom_checks"("resolved");

-- CreateIndex
CREATE INDEX "symptom_checks_createdAt_idx" ON "symptom_checks"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_slug_key" ON "facilities"("slug");

-- CreateIndex
CREATE INDEX "facilities_division_district_idx" ON "facilities"("division", "district");

-- CreateIndex
CREATE INDEX "facilities_upazila_idx" ON "facilities"("upazila");

-- CreateIndex
CREATE INDEX "facilities_type_idx" ON "facilities"("type");

-- CreateIndex
CREATE INDEX "facilities_isActive_idx" ON "facilities"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "facility_admins_email_key" ON "facility_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "facility_admins_facilityId_key" ON "facility_admins"("facilityId");

-- CreateIndex
CREATE INDEX "facility_admins_email_idx" ON "facility_admins"("email");

-- CreateIndex
CREATE INDEX "community_posts_upazila_idx" ON "community_posts"("upazila");

-- CreateIndex
CREATE INDEX "community_posts_isVisible_idx" ON "community_posts"("isVisible");

-- CreateIndex
CREATE INDEX "community_posts_createdAt_idx" ON "community_posts"("createdAt");

-- CreateIndex
CREATE INDEX "sms_reminders_status_idx" ON "sms_reminders"("status");

-- CreateIndex
CREATE INDEX "sms_reminders_scheduledSendAt_idx" ON "sms_reminders"("scheduledSendAt");

-- CreateIndex
CREATE INDEX "sms_reminders_childId_idx" ON "sms_reminders"("childId");
