// Bangladesh EPI (Expanded Programme on Immunisation) schedule
// Source: DGHS / WHO Bangladesh country schedule
// eligibleAgeDays = minimum age in days for automatic scheduling
const epiSchedule = [
  {
    nameEn: 'BCG',
    nameBn: 'বিসিজি',
    doses: [
      { doseNumber: 1, nameEn: 'BCG', nameBn: 'বিসিজি', eligibleAgeDays: 0 },
    ],
  },
  {
    nameEn: 'OPV',
    nameBn: 'ওপিভি',
    doses: [
      { doseNumber: 0, nameEn: 'OPV 0', nameBn: 'ওপিভি ০', eligibleAgeDays: 0 },
      { doseNumber: 1, nameEn: 'OPV 1', nameBn: 'ওপিভি ১', eligibleAgeDays: 42 },
      { doseNumber: 2, nameEn: 'OPV 2', nameBn: 'ওপিভি ২', eligibleAgeDays: 70 },
      { doseNumber: 3, nameEn: 'OPV 3', nameBn: 'ওপিভি ৩', eligibleAgeDays: 98 },
    ],
  },
  {
    nameEn: 'Pentavalent',
    nameBn: 'পেন্টাভ্যালেন্ট',
    doses: [
      { doseNumber: 1, nameEn: 'Penta 1', nameBn: 'পেন্টা ১', eligibleAgeDays: 42 },
      { doseNumber: 2, nameEn: 'Penta 2', nameBn: 'পেন্টা ২', eligibleAgeDays: 70 },
      { doseNumber: 3, nameEn: 'Penta 3', nameBn: 'পেন্টা ৩', eligibleAgeDays: 98 },
    ],
  },
  {
    nameEn: 'PCV',
    nameBn: 'পিসিভি',
    doses: [
      { doseNumber: 1, nameEn: 'PCV 1', nameBn: 'পিসিভি ১', eligibleAgeDays: 42 },
      { doseNumber: 2, nameEn: 'PCV 2', nameBn: 'পিসিভি ২', eligibleAgeDays: 70 },
      { doseNumber: 3, nameEn: 'PCV Booster', nameBn: 'পিসিভি বুস্টার', eligibleAgeDays: 365 },
    ],
  },
  {
    nameEn: 'IPV',
    nameBn: 'আইপিভি',
    doses: [
      { doseNumber: 1, nameEn: 'IPV', nameBn: 'আইপিভি', eligibleAgeDays: 98 },
    ],
  },
  {
    nameEn: 'MR',
    nameBn: 'এমআর',
    doses: [
      { doseNumber: 1, nameEn: 'MR 1', nameBn: 'এমআর ১', eligibleAgeDays: 274 },
      { doseNumber: 2, nameEn: 'MR 2', nameBn: 'এমআর ২', eligibleAgeDays: 456 },
    ],
  },
  {
    // Given every 6 months from 6m to 59m via national Vitamin A Plus campaigns
    nameEn: 'Vitamin A',
    nameBn: 'ভিটামিন এ',
    doses: [
      { doseNumber: 1, nameEn: 'Vitamin A (6m)',  nameBn: 'ভিটামিন এ (৬ মাস)',  eligibleAgeDays: 183 },
      { doseNumber: 2, nameEn: 'Vitamin A (12m)', nameBn: 'ভিটামিন এ (১২ মাস)', eligibleAgeDays: 365 },
      { doseNumber: 3, nameEn: 'Vitamin A (18m)', nameBn: 'ভিটামিন এ (১৮ মাস)', eligibleAgeDays: 548 },
      { doseNumber: 4, nameEn: 'Vitamin A (24m)', nameBn: 'ভিটামিন এ (২৪ মাস)', eligibleAgeDays: 730 },
      { doseNumber: 5, nameEn: 'Vitamin A (30m)', nameBn: 'ভিটামিন এ (৩০ মাস)', eligibleAgeDays: 913 },
      { doseNumber: 6, nameEn: 'Vitamin A (36m)', nameBn: 'ভিটামিন এ (৩৬ মাস)', eligibleAgeDays: 1096 },
      { doseNumber: 7, nameEn: 'Vitamin A (42m)', nameBn: 'ভিটামিন এ (৪২ মাস)', eligibleAgeDays: 1278 },
      { doseNumber: 8, nameEn: 'Vitamin A (48m)', nameBn: 'ভিটামিন এ (৪৮ মাস)', eligibleAgeDays: 1461 },
      { doseNumber: 9, nameEn: 'Vitamin A (54m)', nameBn: 'ভিটামিন এ (৫৪ মাস)', eligibleAgeDays: 1643 },
    ],
  },
]

async function seedVaccines(prisma) {
  console.log('Seeding Bangladesh EPI vaccine schedule...')

  const existing = await prisma.vaccine.count()
  if (existing > 0) {
    console.log(`  Vaccines already seeded (${existing} found), skipping.`)
    return
  }

  let vaccineCount = 0
  let doseCount = 0

  for (const { doses, ...vaccineFields } of epiSchedule) {
    const vaccine = await prisma.vaccine.create({
      data: {
        ...vaccineFields,
        doses: {
          create: doses,
        },
      },
      include: { doses: true },
    })

    vaccineCount += 1
    doseCount += vaccine.doses.length

    console.log(`  ✓ ${vaccine.nameEn} — ${vaccine.doses.length} dose(s)`)
  }

  console.log(`  Vaccines   : ${vaccineCount}`)
  console.log(`  Doses      : ${doseCount}`)
}

module.exports = { seedVaccines }
