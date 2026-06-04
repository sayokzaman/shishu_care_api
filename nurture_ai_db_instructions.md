# NurtureAI — Database Implementation Instructions for AI Agent

## 0. Your Mission

Implement the **complete, production-ready database layer** for NurtureAI using Prisma ORM. This covers:
writing the final schema, creating all migrations, writing the seed file, wiring Prisma to all existing
API routes (replacing the current localStorage-only logic), and creating shared DB utility functions.

**Do not touch**: any frontend component files, any static data files (`myths.ts`, `nutrition.ts`,
`epi-schedule.ts`, `facilities.ts`, `bangladesh.ts`, `milestones.ts`, `care-cards.ts`), or any Groq
AI/rule engine logic. **Database layer only.**

---

## 1. Non-Negotiable Design Rules

Before touching a single file, internalize these rules. Every implementation decision must respect them.

1. **Primary user is the mother/parent.** The DB is optimised for parent-facing reads. CHWs are a secondary
   role on the same `Parent` model — they are not a separate user system.

2. **Phone-only auth.** `Parent.phone` is the sole unique identifier. No email field, no password field,
   no OAuth. Phone OTP is handled by Supabase/your auth layer — the DB just stores the result.

3. **Soft deletes on all health records.** Never call `prisma.child.delete()` or
   `prisma.vaccinationRecord.delete()`. Health records must be preserved. Use `isActive = false` and
   `deletedAt` for all removal operations.

4. **Safety floor on triage.** `SymptomCheck.ruleEngineLevel` is written once at creation and is
   **immutable forever**. No UPDATE operation may include this field. `urgencyLevel` must always be
   `>= ruleEngineLevel` — enforce this server-side in the helper function, not in the API route.

5. **Stale facility data is dangerous.** The `staleWarning` flag on a facility is **computed at query
   time** — it is NOT stored as a column. Any facility whose `lastUpdatedAt` is more than 24 hours ago
   returns `staleWarning: true` in the API response.

6. **No PII to Groq.** The `SymptomCheck` model deliberately stores only symptom IDs and age in months.
   Child name, parent phone, and location are never passed to the AI layer. Do not change this.

7. **Offline-first.** Every model has `createdAt` and `updatedAt` timestamps for client↔server sync
   conflict resolution. The DB `id` (cuid) is the canonical ID — the client replaces any temp local ID
   with the DB ID after the first successful API write.

8. **Static data stays static.** The EPI schedule, WHO milestones, myths, nutrition recipes, and
   Bangladesh administrative hierarchy are **TypeScript data files bundled at build time**. They are NOT
   replicated into the DB. The DB only stores per-child state layered on top of those datasets.

---

## 2. File Locations

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Replace entirely with the schema in Section 4 |
| `prisma/seed.ts` | Create from scratch — Section 7 |
| `lib/db.ts` | Create — Prisma singleton — Section 3 |
| `lib/db-helpers.ts` | Create — shared helper functions — Section 8 |
| `/api/child/route.ts` | Wire to Prisma — Section 9 |
| `/api/triage/route.ts` | Wire to Prisma (keep all Groq logic) — Section 9 |
| `/api/facility/route.ts` | Wire to Prisma (keep MCP envelope) — Section 9 |
| `/api/vaccination/route.ts` | Wire to Prisma (keep MCP envelope) — Section 9 |
| `/api/community/route.ts` | Wire to Prisma — Section 9 |
| `/api/growth/route.ts` | Wire to Prisma — Section 9 |
| `/api/milestone/route.ts` | Wire to Prisma — Section 9 |
| `/api/sms-reminders/route.ts` | Create new — Section 9 |
| `package.json` | Add db scripts and seed config — Section 10 |
| `.env` | Add `DATABASE_URL` — Section 10 |

---

## 3. Prisma Client Singleton

Create `lib/db.ts`. This is the only place in the entire codebase that instantiates PrismaClient.
All API routes import `prisma` from here.

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Why a singleton**: Next.js hot reload creates new module instances on every file change. Without a
global singleton, each reload creates a new PrismaClient that opens a new SQLite connection, exhausting
the connection pool within minutes of development work.

---

## 4. Complete Prisma Schema

Replace the **entire contents** of `prisma/schema.prisma` with the following. Do not partially merge
with whatever exists — replace the whole file.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────────────────────────
// PARENT
// Primary user of the app. Can be a mother/caregiver (role="parent")
// or a community health worker managing multiple families (role="chw").
// Phone is the only required identifier — no email, no password.
// ─────────────────────────────────────────────────────────────────
model Parent {
  id         String    @id @default(cuid())
  phone      String    @unique
  // "bn" = Bangla (default for rural BD), "en" = English
  language   String    @default("bn")
  // "parent" = single-family simplified UI
  // "chw"    = multi-family batch management UI with extra clinical fields
  role       String    @default("parent")
  // Set during onboarding via cascading dropdown — no GPS required
  division   String?
  district   String?
  upazila    String?
  // Timestamps used for client↔DB sync conflict resolution
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  // Last time this parent's Zustand state was successfully synced to DB
  lastSyncAt DateTime?

  children       Child[]
  communityPosts CommunityPost[]

  @@index([phone])
  @@index([upazila])
  @@map("parents")
}

// ─────────────────────────────────────────────────────────────────
// CHILD
// One row per child (or pregnancy). A Parent can have multiple children.
// A CHW account can have children belonging to multiple families —
// in that case, guardianName/guardianPhone stores the biological
// mother's contact, and parentId is the CHW's account ID.
// ─────────────────────────────────────────────────────────────────
model Child {
  id              String    @id @default(cuid())
  parentId        String
  parent          Parent    @relation(fields: [parentId], references: [id], onDelete: Cascade)
  name            String
  // Store in English regardless of UI language: "male" | "female"
  sex             String
  // Postnatal: this field is set and drives all age calculations + EPI schedule
  dateOfBirth     DateTime?
  // Prenatal: set when mother enters EDD during onboarding (-9 months)
  // When baby is born: caller must set dateOfBirth AND clear expectedDueDate in the same PATCH
  expectedDueDate DateTime?
  // Optional baseline — can be null and filled later by CHW on first home visit
  birthWeight     Float?    // kilograms
  knownConditions String?   // free text, bilingual acceptable
  // For CHW role: the actual biological guardian's details
  // These are separate from the CHW account holder's phone
  guardianName    String?
  guardianPhone   String?
  // Soft delete — NEVER hard delete a child record
  isActive        Boolean   @default(true)
  deletedAt       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  vaccinationRecords VaccinationRecord[]
  milestoneRecords   MilestoneRecord[]
  growthRecords      GrowthRecord[]
  symptomChecks      SymptomCheck[]
  smsReminders       SmsReminder[]

  // All queries listing children MUST include: where: { isActive: true }
  @@index([parentId])
  @@index([isActive])
  @@map("children")
}

// ─────────────────────────────────────────────────────────────────
// VACCINATION RECORD
// One row per vaccine dose per child.
// The EPI schedule (what vaccines exist and when they're due by age)
// lives in /data/epi-schedule.ts — do NOT replicate it here.
// This model only tracks per-child dose status.
// All records for a child are created in bulk when the child is first saved.
// ─────────────────────────────────────────────────────────────────
model VaccinationRecord {
  id            String    @id @default(cuid())
  childId       String
  child         Child     @relation(fields: [childId], references: [id], onDelete: Cascade)
  // vaccineId MUST match the id field in /data/epi-schedule.ts
  // Examples: "bcg", "penta1", "penta2", "penta3", "pcv1", "pcv2", "pcv3",
  //           "opv0", "opv1", "opv2", "opv3", "ipv", "mr1", "mr2", "td1", "td2"
  vaccineId     String
  // Copy display names from static data at record creation — needed for offline PDF export
  vaccineName   String
  vaccineNameBn String
  // Computed from child.dateOfBirth + vaccine.offsetWeeks at record creation time
  scheduledDate DateTime
  // Set when mother taps "Mark as received"
  receivedDate  DateTime?
  // IMPORTANT: Do NOT store "overdue" here.
  // Compute it at query time: status === "scheduled" AND scheduledDate < now()
  // Valid stored values: "scheduled" | "received" | "skipped"
  // "skipped" is rare and requires a note explaining why
  status        String    @default("scheduled")
  // CHW-only optional fields for facility-level vaccine tracking
  lotNumber     String?
  batchId       String?
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // One record per vaccine dose per child — enforced at DB level
  @@unique([childId, vaccineId])
  @@index([childId])
  @@index([status])
  @@index([scheduledDate])
  @@map("vaccination_records")
}

// ─────────────────────────────────────────────────────────────────
// MILESTONE RECORD
// One row per WHO milestone per child.
// The milestone definitions (text descriptions, age groups, categories)
// live in /data/milestones.ts — do NOT replicate the content here.
// This model only tracks completion status per child.
// ─────────────────────────────────────────────────────────────────
model MilestoneRecord {
  id            String    @id @default(cuid())
  childId       String
  child         Child     @relation(fields: [childId], references: [id], onDelete: Cascade)
  // milestoneId must match the id field in /data/milestones.ts static data
  milestoneId   String
  // Age group string — copied from static data at record creation for offline PDF export
  // Values: "0-3m" | "3-6m" | "6-9m" | "9-12m" | "12-18m" | "18-24m" | "2-3y" | "3-4y" | "4-5y"
  ageGroup      String
  // Values: "motor" | "speech" | "social" | "cognitive"
  category      String
  // Copy from static data at creation — ensures PDF export works offline
  descriptionEn String
  descriptionBn String
  completed     Boolean   @default(false)
  completedAt   DateTime?
  // Set when parent flags a milestone as possibly delayed — triggers referral nudge
  concernNote   String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([childId, milestoneId])
  @@index([childId])
  @@index([ageGroup])
  @@index([completed])
  @@map("milestone_records")
}

// ─────────────────────────────────────────────────────────────────
// GROWTH RECORD
// One row per measurement session. Multiple records per child (time series).
// Used for Recharts weight/height/MUAC visualisation.
// ─────────────────────────────────────────────────────────────────
model GrowthRecord {
  id       String   @id @default(cuid())
  childId  String
  child    Child    @relation(fields: [childId], references: [id], onDelete: Cascade)
  // Date of measurement — may be in the past (retroactive data entry)
  date     DateTime
  weight   Float?   // kilograms, store to 2 decimal places
  height   Float?   // centimetres, store to 1 decimal place
  // Mid-upper arm circumference in centimetres
  muac     Float?
  // WHO MUAC thresholds for children aged 6–59 months:
  //   >= 12.5 cm  → "green"  (well-nourished)
  //   11.5–12.4cm → "yellow" (moderate acute malnutrition, MAM)
  //   < 11.5 cm   → "red"    (severe acute malnutrition, SAM — urgent referral)
  //   null        → either no MUAC measured OR child is outside 6–59m window
  // Compute server-side in db-helpers.ts BEFORE storing. Client must never set this.
  muacBand String?  // "green" | "yellow" | "red" | null
  // WHO z-score classifications — compute server-side
  // Values: "normal" | "overweight" | "underweight" | "wasted" | "stunted" | null
  weightForAgeStatus String?
  heightForAgeStatus String?
  notes    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Must always query with orderBy: { date: "asc" } for Recharts time-series charts
  @@index([childId])
  @@index([date])
  @@map("growth_records")
}

// ─────────────────────────────────────────────────────────────────
// SYMPTOM CHECK (Triage Session)
// One row per triage session initiated by a parent or CHW.
// This is the most safety-critical model in the entire database.
// Read the implementation notes in Section 5 before touching this model.
// ─────────────────────────────────────────────────────────────────
model SymptomCheck {
  id               String    @id @default(cuid())
  childId          String
  child            Child     @relation(fields: [childId], references: [id], onDelete: Cascade)
  // JSON-serialised string array of symptom IDs selected by the mother
  // Example stored value: '["fever","cough","diarrhea"]'
  // Always write with JSON.stringify(), always read with JSON.parse()
  symptoms         String

  // ══ SAFETY CRITICAL — READ CAREFULLY ══
  // ruleEngineLevel: Set by the IMCI rule engine BEFORE any AI call.
  // Written ONCE at creation. MUST NEVER be changed by any UPDATE.
  // Represents the minimum safe urgency level for this symptom combination.
  // 1 = Home Care  2 = Visit CHW  3 = Upazila HC  4 = Emergency
  ruleEngineLevel  Int

  // urgencyLevel: Final displayed level. Always >= ruleEngineLevel.
  // The server-side helper enforces: urgencyLevel = Math.max(ruleEngineLevel, aiLevel)
  // This can equal ruleEngineLevel (AI agrees) or be higher (AI raises severity)
  // but it can NEVER be lower. Enforce this in createSymptomCheck() in db-helpers.ts.
  urgencyLevel     Int

  // Display label in English — stored for PDF export and history display
  // Values: "home_care" | "visit_chw" | "upazila_hc" | "emergency"
  urgencyLabel     String

  // Whether the Groq AI call succeeded and contributed to the response
  aiEnhanced       Boolean   @default(false)

  // Bilingual immediate action instruction — from AI if available, static fallback otherwise
  immediateActionEn String?
  immediateActionBn String?

  // JSON-serialised string arrays of up to 3 advice bullets each
  // Example: '["Give ORS every 5 minutes","Continue breastfeeding","Monitor for blood in stool"]'
  // Enforce max 3 items in createSymptomCheck() before storing
  bulletPointsEn   String?
  bulletPointsBn   String?

  // For Level 3+: reference to the facility recommended to the mother
  facilityId       String?

  // Episode lifecycle — the only fields that can be updated after creation
  resolved         Boolean   @default(false)
  resolvedAt       DateTime?
  // Values: "home_care_worked" | "visited_chw" | "visited_facility" | "admitted" | "other"
  outcomeNote      String?

  createdAt        DateTime  @default(now())
  // updatedAt is only ever written for: resolved, resolvedAt, outcomeNote
  // Medical fields (ruleEngineLevel, urgencyLevel, symptoms, bulletPoints) are immutable
  updatedAt        DateTime  @updatedAt

  @@index([childId])
  @@index([urgencyLevel])
  @@index([resolved])
  @@index([createdAt])
  @@map("symptom_checks")
}

// ─────────────────────────────────────────────────────────────────
// FACILITY
// Seeded once from /data/facilities.ts. Facility staff update the
// 4 availability fields via the admin web panel.
// staleWarning is NOT a stored column — always compute it at query time.
// ─────────────────────────────────────────────────────────────────
model Facility {
  id              String    @id @default(cuid())
  // Human-readable unique slug for upsert operations — e.g. "dhaka-upazila-hc-savar"
  slug            String    @unique
  name            String
  nameBn          String?
  // Determines which urgency level(s) this facility is shown for in the finder:
  // "chw_post"          → Level 2
  // "upazila_hc"        → Level 3
  // "district_hospital" → Level 3 (higher capacity than upazila HC)
  // "medical_college"   → Level 4
  // "tertiary"          → Level 4
  type            String
  // Bangladesh administrative location
  division        String
  district        String
  upazila         String?
  address         String?
  addressBn       String?
  phone           String?
  // Optional coordinates — used only if available.
  // App uses upazila-based matching, NOT GPS proximity — do not make these required.
  latitude        Float?
  longitude       Float?

  // ── AVAILABILITY FIELDS — updated by facility admin panel only ──
  // Default all to false/null — facility staff must actively update them
  beds            Int?      // current available beds; null = unknown
  oxygenAvailable Boolean   @default(false)
  pediatricUnit   Boolean   @default(false)
  powerBackup     Boolean   @default(false)
  // Updated on every admin panel submission
  // COMPUTE staleWarning at query time: (now - lastUpdatedAt) > 86400000ms
  // DO NOT add a staleWarning column here
  lastUpdatedAt   DateTime  @default(now())

  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  facilityAdmin   FacilityAdmin?

  @@index([division, district])
  @@index([upazila])
  @@index([type])
  @@index([isActive])
  @@map("facilities")
}

// ─────────────────────────────────────────────────────────────────
// FACILITY ADMIN
// One admin account per facility. Separate auth system from parents.
// Authenticated with email + PIN (not phone OTP).
// ─────────────────────────────────────────────────────────────────
model FacilityAdmin {
  id         String   @id @default(cuid())
  email      String   @unique
  // bcrypt hash of a 4–6 digit PIN — NEVER store plaintext
  pinHash    String
  facilityId String   @unique
  facility   Facility @relation(fields: [facilityId], references: [id])
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  lastLogin  DateTime?

  @@index([email])
  @@map("facility_admins")
}

// ─────────────────────────────────────────────────────────────────
// COMMUNITY POST
// Public health tips and Q&A filtered by upazila.
// Moderation is manual: admin sets isVisible = false to hide a post.
// ─────────────────────────────────────────────────────────────────
model CommunityPost {
  id          String   @id @default(cuid())
  authorId    String
  author      Parent   @relation(fields: [authorId], references: [id])
  content     String   // max 500 characters — enforce in API route validation
  // Store author's location at time of posting for upazila-based feed filtering
  division    String?
  district    String?
  upazila     String?
  upvotes     Int      @default(0)
  // isModerated = true means it has been reviewed by an admin (approved or hidden)
  isModerated Boolean  @default(false)
  // isVisible = false hides the post from all non-admin users
  isVisible   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([upazila])
  @@index([isVisible])
  @@index([createdAt])
  @@map("community_posts")
}

// ─────────────────────────────────────────────────────────────────
// SMS REMINDER
// Queue table consumed by n8n webhook polling.
// One row per SMS to be sent (7 days before each vaccine due date).
// Created by markVaccineReceived() in db-helpers.ts.
// ─────────────────────────────────────────────────────────────────
model SmsReminder {
  id              String    @id @default(cuid())
  childId         String
  child           Child     @relation(fields: [childId], references: [id], onDelete: Cascade)
  vaccineId       String
  vaccineName     String
  vaccineNameBn   String
  // The phone number to send to — may be the biological mother's OR the CHW's
  // Taken from Parent.phone at the time the vaccination is marked received
  phoneNumber     String
  // scheduledSendAt = vaccine.scheduledDate - 7 days
  scheduledSendAt DateTime
  sentAt          DateTime?
  // "queued"    = waiting to be picked up by n8n webhook poll
  // "sent"      = SMS gateway confirmed delivery
  // "failed"    = gateway returned an error (n8n retries up to 3 times)
  // "cancelled" = vaccine was marked received before this SMS was sent
  status          String    @default("queued")
  retryCount      Int       @default(0)
  errorMessage    String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([status])
  @@index([scheduledSendAt])
  @@index([childId])
  @@map("sms_reminders")
}
```

---

## 5. Critical Implementation Notes Per Model

### Parent
- When a CHW creates a child for a family they serve, `Child.parentId` is the CHW's `Parent.id`.
  Set `Child.guardianName` and `Child.guardianPhone` to the biological mother's details. These two
  fields exist specifically because in rural BD, the phone number used to register may be the CHW's,
  not the mother's.

### Child — the EDD → DOB transition
When a prenatal child (`expectedDueDate` set, `dateOfBirth` null) transitions to postnatal (baby is
born), the PATCH to update must:
1. Set `dateOfBirth` to the actual birth date
2. Set `expectedDueDate` to null
3. Check if `VaccinationRecord` rows already exist for this child. If count === 0 (no EPI records
   created yet), call `initializeVaccinationSchedule(childId, dateOfBirth)` immediately.
4. The prenatal module on the frontend should automatically switch to the postnatal module when it
   detects `dateOfBirth` is set.

### VaccinationRecord — bulk initialisation
When a child with `dateOfBirth` is first created (not prenatal), immediately create ALL vaccination
records for the entire EPI schedule in one `createMany` call. Do not create them lazily one by one
as the parent navigates the app. All doses must be present in the DB from day one so the dashboard
can show the full upcoming schedule and compute the next due date correctly.

### SymptomCheck — the two write operations
There are exactly two legitimate write operations on `SymptomCheck`:
1. **CREATE** — happens when the triage session completes. Sets all medical fields. `ruleEngineLevel`
   is set here and never touched again.
2. **PATCH** — happens only when the mother taps "Mark as resolved". Only `resolved`, `resolvedAt`,
   and `outcomeNote` are updated. Any PATCH request that includes `ruleEngineLevel`, `urgencyLevel`,
   `symptoms`, `aiEnhanced`, or `bulletPoints` must be rejected with HTTP 400.

### GrowthRecord — Recharts requirements
Always query growth records with `orderBy: { date: "asc" }`. The Recharts `<LineChart>` component
expects time-series data in ascending chronological order. If records come out of order, the chart
line will draw backward.

### Facility — staleWarning computation
Every query that returns facility data (in `/api/facility` and anywhere else) must add the computed
field before returning:
```typescript
const STALE_MS = 24 * 60 * 60 * 1000
return {
  ...facility,
  staleWarning: Date.now() - facility.lastUpdatedAt.getTime() > STALE_MS,
}
```
This field does not exist in the DB schema. It is computed and injected at the API layer only.

---

## 6. JSON Serialisation Rules

SQLite stores Prisma `String` fields as TEXT. The following model fields store JSON arrays as
serialised strings. Apply these rules consistently — create two utility functions in `lib/db-helpers.ts`
to handle this:

```typescript
// Use these for all JSON array fields in SymptomCheck
export const toJsonField = (arr: unknown[]): string => JSON.stringify(arr)
export const fromJsonField = <T>(str: string | null | undefined): T[] => {
  if (!str) return []
  try { return JSON.parse(str) as T[] } catch { return [] }
}
```

| Model | Field | Type | Notes |
|-------|-------|------|-------|
| SymptomCheck | symptoms | `string[]` | symptom IDs |
| SymptomCheck | bulletPointsEn | `string[]` | max 3 items, enforce before store |
| SymptomCheck | bulletPointsBn | `string[]` | max 3 items, enforce before store |

---

## 7. Seed File

Create `prisma/seed.ts`. This file seeds two things only:
1. All facilities from `/data/facilities.ts` into the `Facility` table
2. A small set of demo community posts so the forum is not empty on first load

It uses `upsert` with the `slug` as the key — safe to re-run without creating duplicates.
The `update: {}` on facility upserts means re-seeding will NOT overwrite admin-updated
availability fields (beds, oxygen, etc.) — this is intentional.

```typescript
import { PrismaClient } from '@prisma/client'
// Import your existing static facility data
import { facilities } from '../data/facilities'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding facilities...')

  for (const f of facilities) {
    await prisma.facility.upsert({
      where: { slug: f.id },
      // update: {} intentionally empty — do not overwrite admin-updated availability
      update: {},
      create: {
        slug: f.id,
        name: f.name,
        nameBn: f.nameBn ?? null,
        type: mapFacilityType(f.type),
        division: f.division,
        district: f.district,
        upazila: f.upazila ?? null,
        address: f.address ?? null,
        addressBn: f.addressBn ?? null,
        phone: f.phone ?? null,
        latitude: f.lat ?? null,
        longitude: f.lng ?? null,
        beds: f.beds ?? null,
        oxygenAvailable: f.oxygen ?? false,
        pediatricUnit: f.pediatric ?? false,
        powerBackup: f.power ?? false,
      },
    })
  }

  console.log(`✅ Seeded ${facilities.length} facilities`)

  // Create a system parent account to own the demo community posts
  const systemParent = await prisma.parent.upsert({
    where: { phone: '__SYSTEM_SEED__' },
    update: {},
    create: {
      phone: '__SYSTEM_SEED__',
      language: 'bn',
      role: 'chw',
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Savar',
    },
  })

  console.log('🌱 Seeding demo community posts...')

  const demoPosts = [
    {
      content:
        'শিশুকে ৬ মাস পর্যন্ত শুধুমাত্র বুকের দুধ খাওয়ান। এতে রোগ প্রতিরোধ ক্ষমতা বাড়ে এবং ডায়রিয়া ও নিউমোনিয়ার ঝুঁকি কমে।',
      upazila: 'Savar',
    },
    {
      content:
        'জ্বর হলে বাচ্চাকে ঠান্ডা পানিতে মুছিয়ে দিন এবং বেশি বেশি তরল খাওয়ান। প্যারাসিটামল ব্যবহার করুন — অ্যাসপিরিন নয়।',
      upazila: 'Mirpur',
    },
    {
      content:
        'সময়মতো টিকা দিন। বাংলাদেশ EPI সময়সূচি অনুযায়ী সকল টিকা সরকারি স্বাস্থ্য কেন্দ্রে বিনামূল্যে পাওয়া যায়।',
      upazila: 'Dhanmondi',
    },
  ]

  for (const post of demoPosts) {
    // Check if a post with this exact content already exists to prevent duplicate seeding
    const existing = await prisma.communityPost.findFirst({
      where: { content: post.content },
    })
    if (!existing) {
      await prisma.communityPost.create({
        data: {
          authorId: systemParent.id,
          content: post.content,
          division: 'Dhaka',
          district: 'Dhaka',
          upazila: post.upazila,
          isModerated: true,
          isVisible: true,
        },
      })
    }
  }

  console.log('✅ Seed complete')
}

// Map your existing static facility type values to the schema enum strings
// Adjust this function to match whatever type values are in your facilities.ts
function mapFacilityType(type: string): string {
  const map: Record<string, string> = {
    chw: 'chw_post',
    'chw-post': 'chw_post',
    upazila: 'upazila_hc',
    'upazila-hc': 'upazila_hc',
    district: 'district_hospital',
    'district-hospital': 'district_hospital',
    'medical-college': 'medical_college',
    tertiary: 'tertiary',
  }
  return map[type.toLowerCase()] ?? type
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

---

## 8. Shared Helper Functions

Create `lib/db-helpers.ts`. API routes call these helpers — they never write Prisma queries inline.
This keeps the routes thin and the DB logic testable and reusable.

```typescript
import { prisma } from './db'
import { addWeeks } from 'date-fns'
// Import your static EPI schedule data
import { epiSchedule } from '../data/epi-schedule'

// ──────────────────────────────────────────────
// JSON SERIALISATION UTILITIES
// ──────────────────────────────────────────────

export const toJsonField = (arr: unknown[]): string => JSON.stringify(arr)

export const fromJsonField = <T>(str: string | null | undefined): T[] => {
  if (!str) return []
  try {
    return JSON.parse(str) as T[]
  } catch {
    return []
  }
}

// ──────────────────────────────────────────────
// VACCINATION HELPERS
// ──────────────────────────────────────────────

/**
 * Called immediately after creating a new Child record with a known dateOfBirth.
 * Creates VaccinationRecord rows for every dose in the Bangladesh EPI schedule.
 * Safe to call multiple times — skipDuplicates prevents re-creation.
 *
 * The epiSchedule array in your static data must have this shape per item:
 *   { id: string, nameEn: string, nameBn: string, offsetWeeks: number }
 */
export async function initializeVaccinationSchedule(
  childId: string,
  dateOfBirth: Date
): Promise<void> {
  const records = epiSchedule.map((vaccine) => ({
    childId,
    vaccineId: vaccine.id,
    vaccineName: vaccine.nameEn,
    vaccineNameBn: vaccine.nameBn,
    scheduledDate: addWeeks(dateOfBirth, vaccine.offsetWeeks),
    status: 'scheduled',
  }))

  await prisma.vaccinationRecord.createMany({
    data: records,
    skipDuplicates: true,
  })
}

/**
 * Marks a vaccination dose as received.
 * Cancels any queued SMS for this vaccine.
 * Queues an SMS reminder for the NEXT upcoming vaccine.
 *
 * @param vaccineRecordId  The Prisma ID of the VaccinationRecord being confirmed
 * @param childId          The child's Prisma ID
 * @param phoneNumber      The phone number to send the next SMS to
 */
export async function markVaccineReceived(
  vaccineRecordId: string,
  childId: string,
  phoneNumber: string,
  options?: { lotNumber?: string; batchId?: string }
) {
  // 1. Mark this dose as received
  const record = await prisma.vaccinationRecord.update({
    where: { id: vaccineRecordId },
    data: {
      status: 'received',
      receivedDate: new Date(),
      lotNumber: options?.lotNumber ?? null,
      batchId: options?.batchId ?? null,
    },
  })

  // 2. Cancel any queued SMS for this specific vaccine
  await prisma.smsReminder.updateMany({
    where: {
      childId,
      vaccineId: record.vaccineId,
      status: 'queued',
    },
    data: { status: 'cancelled' },
  })

  // 3. Find the very next upcoming vaccine dose and queue its SMS
  const nextVaccine = await prisma.vaccinationRecord.findFirst({
    where: {
      childId,
      status: 'scheduled',
      scheduledDate: { gt: record.scheduledDate },
    },
    orderBy: { scheduledDate: 'asc' },
  })

  if (nextVaccine) {
    const sendAt = new Date(nextVaccine.scheduledDate)
    sendAt.setDate(sendAt.getDate() - 7) // 7 days before due date

    // Only create the SMS if the send date is still in the future
    if (sendAt > new Date()) {
      await prisma.smsReminder.create({
        data: {
          childId,
          vaccineId: nextVaccine.vaccineId,
          vaccineName: nextVaccine.vaccineName,
          vaccineNameBn: nextVaccine.vaccineNameBn,
          phoneNumber,
          scheduledSendAt: sendAt,
          status: 'queued',
        },
      })
    }
  }

  return record
}

// ──────────────────────────────────────────────
// GROWTH HELPERS
// ──────────────────────────────────────────────

/**
 * Computes WHO MUAC nutritional status band.
 * Only valid for children aged 6–59 months.
 * Returns null for children outside that age window or if muac is not measured.
 */
export function computeMuacBand(
  muacCm: number,
  ageMonths: number
): 'green' | 'yellow' | 'red' | null {
  if (ageMonths < 6 || ageMonths > 59) return null
  if (muacCm >= 12.5) return 'green'
  if (muacCm >= 11.5) return 'yellow'
  return 'red'
}

/**
 * Returns a child's age in complete months from their dateOfBirth.
 * Returns null if dateOfBirth is not set (prenatal child).
 */
export function getAgeInMonths(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null
  const now = new Date()
  const years = now.getFullYear() - dateOfBirth.getFullYear()
  const months = now.getMonth() - dateOfBirth.getMonth()
  return years * 12 + months
}

// ──────────────────────────────────────────────
// SYMPTOM CHECK (TRIAGE) HELPERS
// ──────────────────────────────────────────────

/**
 * Creates a SymptomCheck record with the medical safety guard enforced.
 *
 * The safety guard: urgencyLevel = Math.max(ruleEngineLevel, aiUrgencyLevel ?? ruleEngineLevel)
 * This means the AI can only raise the urgency level — it can NEVER lower it below what
 * the IMCI rule engine computed. This guard runs here, not in the API route.
 */
export async function createSymptomCheck(params: {
  childId: string
  symptoms: string[]
  ruleEngineLevel: number          // from IMCI rule engine — immutable
  aiUrgencyLevel: number | null    // from Groq AI — may be null if AI failed
  urgencyLabel: string
  aiEnhanced: boolean
  immediateActionEn?: string | null
  immediateActionBn?: string | null
  bulletPointsEn?: string[]
  bulletPointsBn?: string[]
  facilityId?: string | null
}) {
  // ── MEDICAL SAFETY GUARD ── never allow AI to downgrade below rule engine
  const finalUrgency = Math.max(
    params.ruleEngineLevel,
    params.aiUrgencyLevel ?? params.ruleEngineLevel
  )

  // Enforce max 3 bullet points before storing
  const bulletsEn = (params.bulletPointsEn ?? []).slice(0, 3)
  const bulletsBn = (params.bulletPointsBn ?? []).slice(0, 3)

  return prisma.symptomCheck.create({
    data: {
      childId: params.childId,
      symptoms: toJsonField(params.symptoms),
      ruleEngineLevel: params.ruleEngineLevel, // immutable — written once here
      urgencyLevel: finalUrgency,
      urgencyLabel: params.urgencyLabel,
      aiEnhanced: params.aiEnhanced,
      immediateActionEn: params.immediateActionEn ?? null,
      immediateActionBn: params.immediateActionBn ?? null,
      bulletPointsEn: toJsonField(bulletsEn),
      bulletPointsBn: toJsonField(bulletsBn),
      facilityId: params.facilityId ?? null,
    },
  })
}

/**
 * Marks a triage episode as resolved.
 *
 * ONLY updates: resolved, resolvedAt, outcomeNote.
 * Any attempt to update medical fields must be rejected — this function
 * makes that structurally impossible.
 */
export async function resolveSymptomCheck(id: string, outcomeNote: string) {
  return prisma.symptomCheck.update({
    where: { id },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      outcomeNote,
      // ruleEngineLevel, urgencyLevel, symptoms, aiEnhanced, bulletPoints
      // are intentionally absent here — they cannot be changed
    },
  })
}

// ──────────────────────────────────────────────
// FACILITY HELPERS
// ──────────────────────────────────────────────

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

const URGENCY_TYPE_MAP: Record<number, string[]> = {
  1: [],                                            // Level 1 = home care, no facility
  2: ['chw_post'],                                  // Level 2 = visit CHW
  3: ['upazila_hc', 'district_hospital'],           // Level 3 = Upazila HC or District
  4: ['district_hospital', 'medical_college', 'tertiary'], // Level 4 = Emergency referral
}

/**
 * Fetches facilities matched to an urgency level and location.
 * Adds computed staleWarning field to each result.
 * Returns empty array for Level 1 (home care — no facility needed).
 */
export async function getFacilitiesForUrgency(params: {
  urgencyLevel: number
  division?: string
  district?: string
  upazila?: string
}) {
  const allowedTypes = URGENCY_TYPE_MAP[params.urgencyLevel] ?? []
  if (allowedTypes.length === 0) return []

  const facilities = await prisma.facility.findMany({
    where: {
      isActive: true,
      type: { in: allowedTypes },
      ...(params.division ? { division: params.division } : {}),
      ...(params.district ? { district: params.district } : {}),
      ...(params.upazila ? { upazila: params.upazila } : {}),
    },
    orderBy: [{ type: 'asc' }, { district: 'asc' }],
  })

  // Inject computed staleWarning — this field does NOT exist in the DB schema
  return facilities.map((f) => ({
    ...f,
    staleWarning: Date.now() - f.lastUpdatedAt.getTime() > STALE_THRESHOLD_MS,
  }))
}
```

---

## 9. API Route Wiring Guide

For each route, replace localStorage-only data logic with the Prisma calls below.
Keep all existing: Zod validation, Groq AI calls, MCP response envelope shapes,
AbortSignal timeouts, and fallback logic. Touch only the persistence layer.

---

### `POST /api/child`

**Input**: `{ parentId, name, sex, dateOfBirth?, expectedDueDate?, birthWeight?, knownConditions?, guardianName?, guardianPhone? }`

```typescript
import { prisma } from '@/lib/db'
import { initializeVaccinationSchedule } from '@/lib/db-helpers'

const child = await prisma.child.create({
  data: {
    parentId,
    name,
    sex,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    expectedDueDate: expectedDueDate ? new Date(expectedDueDate) : null,
    birthWeight: birthWeight ?? null,
    knownConditions: knownConditions ?? null,
    guardianName: guardianName ?? null,
    guardianPhone: guardianPhone ?? null,
  },
})

// If we have a DOB (postnatal child), initialise the full EPI vaccination schedule now
if (child.dateOfBirth) {
  await initializeVaccinationSchedule(child.id, child.dateOfBirth)
}

return NextResponse.json(child, { status: 201 })
```

---

### `PATCH /api/child/[id]` — EDD → DOB transition at birth

```typescript
import { prisma } from '@/lib/db'
import { initializeVaccinationSchedule } from '@/lib/db-helpers'

const updated = await prisma.child.update({
  where: { id: params.id },
  data: {
    dateOfBirth: new Date(body.dateOfBirth),
    expectedDueDate: null,
    // Allow updating other non-medical fields here too: name, birthWeight, etc.
  },
})

// Initialise vaccination schedule if not already created
const existingCount = await prisma.vaccinationRecord.count({
  where: { childId: params.id },
})
if (existingCount === 0 && updated.dateOfBirth) {
  await initializeVaccinationSchedule(updated.id, updated.dateOfBirth)
}

return NextResponse.json(updated)
```

---

### `GET /api/child/[id]` — fetch child with all sub-records

```typescript
const child = await prisma.child.findUnique({
  where: { id: params.id, isActive: true },
  include: {
    vaccinationRecords: { orderBy: { scheduledDate: 'asc' } },
    milestoneRecords:   { orderBy: { ageGroup: 'asc' } },
    growthRecords:      { orderBy: { date: 'asc' } },      // asc required for Recharts
    symptomChecks:      { orderBy: { createdAt: 'desc' }, take: 20 },
  },
})
if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

// Enrich vaccination records with computed overdue flag
const now = new Date()
const enrichedVaccinations = child.vaccinationRecords.map((v) => ({
  ...v,
  overdue: v.status === 'scheduled' && v.scheduledDate < now,
}))

// Parse JSON fields on symptomChecks
const enrichedChecks = child.symptomChecks.map((c) => ({
  ...c,
  symptoms:      fromJsonField<string>(c.symptoms),
  bulletPointsEn: fromJsonField<string>(c.bulletPointsEn),
  bulletPointsBn: fromJsonField<string>(c.bulletPointsBn),
}))

return NextResponse.json({
  ...child,
  vaccinationRecords: enrichedVaccinations,
  symptomChecks: enrichedChecks,
})
```

---

### `GET /api/parent/[id]/children` — list all active children for a parent

```typescript
const children = await prisma.child.findMany({
  where: { parentId: params.id, isActive: true },
  orderBy: { createdAt: 'asc' },
})
return NextResponse.json(children)
```

---

### `POST /api/triage` — after Groq AI logic runs

The existing Groq/rule engine code runs first. After it produces its result,
add these lines to persist the session:

```typescript
import { createSymptomCheck, getFacilitiesForUrgency } from '@/lib/db-helpers'

// triageResult = the object your existing Groq + rule engine logic produces
const savedCheck = await createSymptomCheck({
  childId: body.childId,
  symptoms: body.symptoms,                        // string[] from client
  ruleEngineLevel: triageResult.ruleEngineLevel,  // from rule engine
  aiUrgencyLevel: triageResult.aiUrgencyLevel,    // from Groq (may be null)
  urgencyLabel: triageResult.urgencyLabel,
  aiEnhanced: triageResult.aiEnhanced,
  immediateActionEn: triageResult.immediateActionEn,
  immediateActionBn: triageResult.immediateActionBn,
  bulletPointsEn: triageResult.bulletPointsEn,
  bulletPointsBn: triageResult.bulletPointsBn,
})

// For Level 3+, fetch facility recommendations and attach to response
let recommendedFacilities = []
if (savedCheck.urgencyLevel >= 3) {
  recommendedFacilities = await getFacilitiesForUrgency({
    urgencyLevel: savedCheck.urgencyLevel,
    division: body.division,
    district: body.district,
    upazila: body.upazila,
  })
}

// Return triage result with DB record ID (client stores this to mark resolved later)
return NextResponse.json({
  ...triageResult,
  id: savedCheck.id,           // client must persist this
  facilities: recommendedFacilities,
})
```

---

### `PATCH /api/triage/[id]/resolve`

```typescript
import { resolveSymptomCheck } from '@/lib/db-helpers'

// Validate outcomeNote is one of the allowed values
const allowed = ['home_care_worked', 'visited_chw', 'visited_facility', 'admitted', 'other']
if (!allowed.includes(body.outcomeNote)) {
  return NextResponse.json({ error: 'Invalid outcomeNote' }, { status: 400 })
}

const updated = await resolveSymptomCheck(params.id, body.outcomeNote)
return NextResponse.json(updated)
```

---

### `POST /api/vaccination/[recordId]/receive` — mark a dose as received

```typescript
import { markVaccineReceived } from '@/lib/db-helpers'

// phoneNumber comes from the parent's account — look it up from the session/token
const parent = await prisma.parent.findUnique({ where: { id: session.parentId } })

const updated = await markVaccineReceived(
  params.recordId,
  body.childId,
  parent!.phone,
  { lotNumber: body.lotNumber, batchId: body.batchId }
)

return NextResponse.json(updated)
```

---

### `GET /api/facility` — MCP-style tool endpoint (keep existing envelope)

Replace the static `facilities.ts` lookup with:

```typescript
import { getFacilitiesForUrgency } from '@/lib/db-helpers'

const urgency  = Number(searchParams.get('urgency') ?? '3')
const division = searchParams.get('division') ?? undefined
const district = searchParams.get('district') ?? undefined
const upazila  = searchParams.get('upazila')  ?? undefined

const results = await getFacilitiesForUrgency({ urgencyLevel: urgency, division, district, upazila })

// Keep existing MCP-style response envelope — do not change the shape
return NextResponse.json({
  tool: 'facility_lookup',
  parameters: { urgency, division, district, upazila },
  results,
  count: results.length,
  timestamp: new Date().toISOString(),
})
```

---

### `PATCH /api/facility/[id]` — facility admin updates availability

```typescript
// Row-level security check: verify the authenticated admin owns this facility
const admin = await prisma.facilityAdmin.findUnique({
  where: { email: session.email },
})
if (!admin || admin.facilityId !== params.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Only these 4 fields are updatable by facility staff — nothing else
const { beds, oxygenAvailable, pediatricUnit, powerBackup } = body

const updated = await prisma.facility.update({
  where: { id: params.id },
  data: {
    ...(beds !== undefined ? { beds } : {}),
    ...(oxygenAvailable !== undefined ? { oxygenAvailable } : {}),
    ...(pediatricUnit !== undefined ? { pediatricUnit } : {}),
    ...(powerBackup !== undefined ? { powerBackup } : {}),
    lastUpdatedAt: new Date(), // always refresh the timestamp
  },
})

return NextResponse.json({
  ...updated,
  staleWarning: false, // just updated — cannot be stale
})
```

---

### `GET /api/community` — upazila-filtered forum feed

```typescript
const upazila = searchParams.get('upazila') ?? undefined
const page    = Number(searchParams.get('page') ?? '1')
const take    = 20

const posts = await prisma.communityPost.findMany({
  where: {
    isVisible: true,
    ...(upazila ? { upazila } : {}),
  },
  include: {
    author: { select: { role: true, upazila: true } }, // never expose phone
  },
  orderBy: [{ upvotes: 'desc' }, { createdAt: 'desc' }],
  skip: (page - 1) * take,
  take,
})

return NextResponse.json(posts)
```

---

### `POST /api/community` — create a post

```typescript
if (!body.content || body.content.trim().length === 0) {
  return NextResponse.json({ error: 'Content is required' }, { status: 400 })
}
if (body.content.length > 500) {
  return NextResponse.json({ error: 'Content must be 500 characters or fewer' }, { status: 400 })
}

const parent = await prisma.parent.findUnique({ where: { id: session.parentId } })

const post = await prisma.communityPost.create({
  data: {
    authorId: session.parentId,
    content: body.content.trim(),
    division: parent?.division ?? null,
    district: parent?.district ?? null,
    upazila:  parent?.upazila  ?? null,
    isModerated: false,
    isVisible: true,
  },
})

return NextResponse.json(post, { status: 201 })
```

---

### `POST /api/child/[id]/growth` — record a growth measurement

```typescript
import { computeMuacBand, getAgeInMonths } from '@/lib/db-helpers'

const child = await prisma.child.findUnique({ where: { id: params.id } })
if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

const ageMonths = getAgeInMonths(child.dateOfBirth)
const muacBand  = body.muac && ageMonths !== null
  ? computeMuacBand(body.muac, ageMonths)
  : null

const record = await prisma.growthRecord.create({
  data: {
    childId: params.id,
    date:    new Date(body.date),
    weight:  body.weight  ?? null,
    height:  body.height  ?? null,
    muac:    body.muac    ?? null,
    muacBand,                        // server-computed, not from client
    notes:   body.notes   ?? null,
  },
})

return NextResponse.json(record, { status: 201 })
```

---

### `GET /api/sms-reminders` — polled by n8n to pick up queued reminders

```typescript
// n8n polls this endpoint on a schedule (e.g. every hour)
const dueReminders = await prisma.smsReminder.findMany({
  where: {
    status: 'queued',
    scheduledSendAt: { lte: new Date() },
  },
  orderBy: { scheduledSendAt: 'asc' },
  take: 50, // process in batches of 50
})

return NextResponse.json({ reminders: dueReminders, count: dueReminders.length })
```

### `PATCH /api/sms-reminders/[id]` — called by n8n after sending or on failure

```typescript
const { status, sentAt, errorMessage, retryCount } = body

const allowed = ['sent', 'failed', 'cancelled']
if (!allowed.includes(status)) {
  return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
}

const updated = await prisma.smsReminder.update({
  where: { id: params.id },
  data: {
    status,
    sentAt: sentAt ? new Date(sentAt) : null,
    errorMessage: errorMessage ?? null,
    retryCount: retryCount ?? undefined,
  },
})

return NextResponse.json(updated)
```

---

## 10. Offline-First Sync Contract

The app uses Zustand + localStorage as the client-side cache.
The DB is the authoritative server-side store. Both must stay in sync.

### On every API write (POST/PATCH)
1. API route writes to Prisma DB first
2. Returns the DB record including its Prisma-generated `id` and `createdAt`
3. Client receives the response and replaces any temporary local ID (e.g. `"temp-${Date.now()}"`)
   with the real DB `id` in its Zustand state

### On app open (when online)
- A `GET /api/parent/[id]/sync` route fetches all of the parent's children plus
  their most recent records (last 30 days of triage, vaccinations, growth)
- Client receives the response and reconciles with local Zustand state
- Conflict resolution rule: **if both DB and local have a record, the one with the
  newer `updatedAt` timestamp wins**

### When offline (no internet)
- Zustand localStorage cache handles all read operations — no UI degradation
- Write operations (new triage session, vaccine marked received, new growth record)
  are appended to a `pendingSync: []` array in the Zustand store
- On next online reconnect, the client processes `pendingSync` items sequentially
  in chronological order (by item's local `createdAt`)
- After each item syncs successfully, remove it from `pendingSync`

### Critical sync rule for SymptomCheck
The `ruleEngineLevel` is computed by the local rule engine on the client device (offline-capable).
It must be included in the POST body when the triage session is saved to the DB.
The server stores it as-is and never recomputes it. The urgency safety guard runs server-side in
`createSymptomCheck()` using the client-provided `ruleEngineLevel` as the floor.

---

## 11. What Must NOT Be Put in the Database

These files stay as TypeScript data files bundled at build time. Do not create DB tables for them.
The DB stores only per-child state (what happened) layered on top of this reference data (what's possible).

| Static File | Contents | Why it stays static |
|-------------|----------|---------------------|
| `data/epi-schedule.ts` | Vaccine IDs, Bangla/English names, offsetWeeks | Never changes; critical for offline use |
| `data/myths.ts` | 30+ myth/fact/partial entries with Bangla text | Keyword search runs in-memory, no DB query needed |
| `data/nutrition.ts` | Age-banded recipes, feeding guides, local ingredients | Read-only content, no user edits |
| `data/bangladesh.ts` | 8 divisions, 64 districts, 492+ upazilas | Dropdown data; too large and stable for DB round-trips |
| `data/milestones.ts` | WHO milestone definitions, age groups, descriptions | Reference data; only completion status (bool) goes in DB |
| `data/care-cards.ts` | Daily care card content per age band | Static content; no user interaction written back |
| `data/facilities.ts` | Source of truth for seed — used once at `prisma db seed` | Seeded into DB once; thereafter DB is the live source |

---

## 12. Migration and Setup Commands

Run these commands in this exact order, in the project root:

```bash
# Step 1: Add DATABASE_URL to .env if not already present
echo 'DATABASE_URL="file:./db/nurture.db"' >> .env

# Step 2: Create the db directory
mkdir -p db

# Step 3: Write the new schema.prisma (replace entirely with Section 4 above)

# Step 4: Generate the Prisma client from the new schema
npx prisma generate

# Step 5: Create and apply the migration
npx prisma migrate dev --name init

# Step 6: Run the seed file
npx prisma db seed

# Step 7: Open Prisma Studio to verify seeded facilities and demo posts
npx prisma studio
```

If the project already has a migration history that conflicts with the new schema, reset cleanly:
```bash
npx prisma migrate reset --force   # drops the DB, re-runs all migrations from scratch
npx prisma db seed
```

For production deployment (Vercel or VPS — no interactive prompts):
```bash
npx prisma migrate deploy
npx prisma db seed
```

Add to `package.json`:
```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate":  "prisma migrate dev",
    "db:seed":     "prisma db seed",
    "db:studio":   "prisma studio",
    "db:reset":    "prisma migrate reset --force && prisma db seed"
  },
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Add to `.env`:
```
DATABASE_URL="file:./db/nurture.db"
```

Add `db/nurture.db` to `.gitignore` — never commit the SQLite database file.

---

## 13. Summary of What You Are Building

| # | Deliverable | Location |
|---|-------------|----------|
| 1 | Prisma schema (9 models) | `prisma/schema.prisma` |
| 2 | Prisma client singleton | `lib/db.ts` |
| 3 | Shared DB helper functions | `lib/db-helpers.ts` |
| 4 | Seed file | `prisma/seed.ts` |
| 5 | Wired API route: child CRUD | `/api/child/route.ts` |
| 6 | Wired API route: triage + persist | `/api/triage/route.ts` |
| 7 | Wired API route: vaccination receive | `/api/vaccination/[recordId]/receive/route.ts` |
| 8 | Wired API route: facility finder | `/api/facility/route.ts` |
| 9 | Wired API route: facility admin update | `/api/facility/[id]/route.ts` |
| 10 | Wired API route: community posts | `/api/community/route.ts` |
| 11 | Wired API route: growth records | `/api/growth/route.ts` |
| 12 | New API route: SMS reminder queue | `/api/sms-reminders/route.ts` |
| 13 | Updated `package.json` | `package.json` |

Do not create any UI components. Do not modify any static data files. Do not change any Groq AI prompt
logic, rule engine logic, Zustand store definitions, or Tailwind configuration. Database layer only.
