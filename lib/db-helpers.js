const { prisma } = require('./db')
const { epiSchedule } = require('../data/epi-schedule')

// ──────────────────────────────────────────────
// JSON SERIALISATION UTILITIES
// ──────────────────────────────────────────────

const toJsonField = (arr) => {
  if (!arr) return '[]'
  return JSON.stringify(arr)
}

const fromJsonField = (str) => {
  if (!str) return []
  try {
    return JSON.parse(str)
  } catch (e) {
    return []
  }
}

// ──────────────────────────────────────────────
// VACCINATION HELPERS
// ──────────────────────────────────────────────

/**
 * Called immediately after creating a new Child record with a known dateOfBirth.
 * Creates VaccinationRecord rows for every dose in the Bangladesh EPI schedule.
 * Safe to call multiple times — uses upsert to avoid duplicate records on re-call.
 * Note: SQLite does not support createMany with skipDuplicates, so we upsert individually.
 */
async function initializeVaccinationSchedule(childId, dateOfBirth) {
  const dobTime = new Date(dateOfBirth).getTime()

  for (const vaccine of epiSchedule) {
    const scheduledDate = new Date(dobTime + vaccine.offsetWeeks * 7 * 24 * 60 * 60 * 1000)
    await prisma.vaccinationRecord.upsert({
      where: {
        childId_vaccineId: { childId, vaccineId: vaccine.id },
      },
      update: {}, // do not overwrite existing records (e.g. already received doses)
      create: {
        childId,
        vaccineId: vaccine.id,
        vaccineName: vaccine.nameEn,
        vaccineNameBn: vaccine.nameBn,
        scheduledDate,
        status: 'scheduled',
      },
    })
  }
}

/**
 * Marks a vaccination dose as received.
 * Cancels any queued SMS for this vaccine.
 * Queues an SMS reminder for the NEXT upcoming vaccine.
 */
async function markVaccineReceived(vaccineRecordId, childId, phoneNumber, options) {
  // 1. Mark this dose as received
  const record = await prisma.vaccinationRecord.update({
    where: { id: vaccineRecordId },
    data: {
      status: 'received',
      receivedDate: new Date(),
      lotNumber: (options && options.lotNumber) || null,
      batchId: (options && options.batchId) || null,
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
function computeMuacBand(muacCm, ageMonths) {
  if (ageMonths === null || ageMonths < 6 || ageMonths > 59) return null
  if (!muacCm) return null
  if (muacCm >= 12.5) return 'green'
  if (muacCm >= 11.5) return 'yellow'
  return 'red'
}

/**
 * Returns a child's age in complete months from their dateOfBirth.
 * Returns null if dateOfBirth is not set (prenatal child).
 */
function getAgeInMonths(dateOfBirth) {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  const now = new Date()
  const years = now.getFullYear() - dob.getFullYear()
  const months = now.getMonth() - dob.getMonth()
  return years * 12 + months
}

// ──────────────────────────────────────────────
// SYMPTOM CHECK (TRIAGE) HELPERS
// ──────────────────────────────────────────────

/**
 * Creates a SymptomCheck record with the medical safety guard enforced.
 */
async function createSymptomCheck(params) {
  // ── MEDICAL SAFETY GUARD ── never allow AI to downgrade below rule engine
  const finalUrgency = Math.max(
    params.ruleEngineLevel,
    params.aiUrgencyLevel !== undefined && params.aiUrgencyLevel !== null 
      ? params.aiUrgencyLevel 
      : params.ruleEngineLevel
  )

  // Enforce max 3 bullet points before storing
  const bulletsEn = (params.bulletPointsEn || []).slice(0, 3)
  const bulletsBn = (params.bulletPointsBn || []).slice(0, 3)

  return prisma.symptomCheck.create({
    data: {
      childId: params.childId,
      symptoms: toJsonField(params.symptoms),
      ruleEngineLevel: params.ruleEngineLevel, // immutable — written once here
      urgencyLevel: finalUrgency,
      urgencyLabel: params.urgencyLabel,
      aiEnhanced: !!params.aiEnhanced,
      immediateActionEn: params.immediateActionEn || null,
      immediateActionBn: params.immediateActionBn || null,
      bulletPointsEn: toJsonField(bulletsEn),
      bulletPointsBn: toJsonField(bulletsBn),
      facilityId: params.facilityId || null,
    },
  })
}

/**
 * Marks a triage episode as resolved.
 */
async function resolveSymptomCheck(id, outcomeNote) {
  return prisma.symptomCheck.update({
    where: { id },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      outcomeNote,
    },
  })
}

// ──────────────────────────────────────────────
// FACILITY HELPERS
// ──────────────────────────────────────────────

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

const URGENCY_TYPE_MAP = {
  1: [],                                            // Level 1 = home care, no facility
  2: ['chw_post'],                                  // Level 2 = visit CHW
  3: ['upazila_hc', 'district_hospital'],           // Level 3 = Upazila HC or District
  4: ['district_hospital', 'medical_college', 'tertiary'], // Level 4 = Emergency referral
}

/**
 * Fetches facilities matched to an urgency level and location.
 * Adds computed staleWarning field to each result.
 */
async function getFacilitiesForUrgency(params) {
  const allowedTypes = URGENCY_TYPE_MAP[params.urgencyLevel] || []
  if (allowedTypes.length === 0) return []

  const queryConditions = {
    isActive: true,
    type: { in: allowedTypes }
  }

  if (params.division) queryConditions.division = params.division.toLowerCase()
  if (params.district) queryConditions.district = params.district.toLowerCase()
  if (params.upazila) queryConditions.upazila = params.upazila.toLowerCase()

  const facilities = await prisma.facility.findMany({
    where: queryConditions,
    orderBy: [{ type: 'asc' }, { district: 'asc' }],
  })

  // Inject computed staleWarning — this field does NOT exist in the DB schema
  const nowTime = Date.now()
  return facilities.map((f) => {
    return {
      ...f,
      staleWarning: nowTime - new Date(f.lastUpdatedAt).getTime() > STALE_THRESHOLD_MS,
    }
  })
}

module.exports = {
  toJsonField,
  fromJsonField,
  initializeVaccinationSchedule,
  markVaccineReceived,
  computeMuacBand,
  getAgeInMonths,
  createSymptomCheck,
  resolveSymptomCheck,
  getFacilitiesForUrgency,
}
