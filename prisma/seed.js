/**
 * ShishuCare — Database Seed Script
 * Run: node prisma/seed.js
 *
 * TEST LOGIN CREDENTIALS
 * ──────────────────────────────────────────────
 *  Role           Phone          Password
 *  Parent         01712345678    password123
 *  Health Worker  01812345678    worker123
 * ──────────────────────────────────────────────
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ShishuCare database...\n');

  // ── Vaccinations ──────────────────────────────────────────
  const vaccinations = await Promise.all([
    prisma.vaccination.upsert({ where: { id: 1 }, update: {}, create: { name: 'BCG (Bacillus Calmette-Guérin)', shortName: 'BCG', recommendedAgeWeeks: 0, description: 'Protection against tuberculosis. Given at birth.', isMandatory: true, dosesRequired: 1 } }),
    prisma.vaccination.upsert({ where: { id: 2 }, update: {}, create: { name: 'Polio OPV (Oral Polio Vaccine)', shortName: 'OPV', recommendedAgeWeeks: 0, description: 'Protection against poliomyelitis. First dose at birth.', isMandatory: true, dosesRequired: 4 } }),
    prisma.vaccination.upsert({ where: { id: 3 }, update: {}, create: { name: 'Pentavalent Vaccine', shortName: 'Penta', recommendedAgeWeeks: 6, description: 'DPT + HepB + Hib combination vaccine.', isMandatory: true, dosesRequired: 3 } }),
    prisma.vaccination.upsert({ where: { id: 4 }, update: {}, create: { name: 'Pneumococcal Conjugate Vaccine', shortName: 'PCV', recommendedAgeWeeks: 6, description: 'Protection against pneumococcal disease.', isMandatory: true, dosesRequired: 3 } }),
    prisma.vaccination.upsert({ where: { id: 5 }, update: {}, create: { name: 'Measles & Rubella Vaccine', shortName: 'MR', recommendedAgeWeeks: 36, description: 'Protection against measles and rubella. At 9 months.', isMandatory: true, dosesRequired: 2 } }),
    prisma.vaccination.upsert({ where: { id: 6 }, update: {}, create: { name: 'MMR Vaccine', shortName: 'MMR', recommendedAgeWeeks: 52, description: 'Measles, Mumps, Rubella. At 12–15 months.', isMandatory: true, dosesRequired: 1 } }),
    prisma.vaccination.upsert({ where: { id: 7 }, update: {}, create: { name: 'Hepatitis B', shortName: 'HepB', recommendedAgeWeeks: 0, description: 'Given at birth for hepatitis B protection.', isMandatory: true, dosesRequired: 3 } }),
    prisma.vaccination.upsert({ where: { id: 8 }, update: {}, create: { name: 'Rotavirus Vaccine', shortName: 'RV', recommendedAgeWeeks: 6, description: 'Protection against rotavirus diarrhea.', isMandatory: true, dosesRequired: 2 } }),
  ]);
  console.log(`✅ ${vaccinations.length} vaccinations seeded`);

  // ── Milestones ────────────────────────────────────────────
  const milestoneData = [
    { label: 'Holds head up', ageMonths: 2, category: 'motor' },
    { label: 'Smiles responsively', ageMonths: 2, category: 'social' },
    { label: 'Follows moving objects', ageMonths: 2, category: 'cognitive' },
    { label: 'Coos and makes sounds', ageMonths: 2, category: 'language' },
    { label: 'Rolls over', ageMonths: 4, category: 'motor' },
    { label: 'Reaches for objects', ageMonths: 4, category: 'motor' },
    { label: 'Laughs out loud', ageMonths: 4, category: 'social' },
    { label: 'Sits with support', ageMonths: 6, category: 'motor' },
    { label: 'Responds to name', ageMonths: 6, category: 'social' },
    { label: 'Starts crawling', ageMonths: 9, category: 'motor' },
    { label: 'Stands with support', ageMonths: 10, category: 'motor' },
    { label: 'First words', ageMonths: 12, category: 'language' },
    { label: 'Walks with support', ageMonths: 12, category: 'motor' },
    { label: 'Points to objects', ageMonths: 12, category: 'cognitive' },
    { label: 'Walks independently', ageMonths: 15, category: 'motor' },
  ];
  await prisma.milestone.deleteMany({});
  await prisma.milestone.createMany({ data: milestoneData });
  console.log(`✅ ${milestoneData.length} milestones seeded`);

  // ── Bangladesh divisions ──────────────────────────────────
  await prisma.division.deleteMany({});
  const divisions = await prisma.division.createMany({
    data: [
      { nameEn: 'Dhaka', nameBn: 'ঢাকা' }, { nameEn: 'Chittagong', nameBn: 'চট্টগ্রাম' },
      { nameEn: 'Rajshahi', nameBn: 'রাজশাহী' }, { nameEn: 'Khulna', nameBn: 'খুলনা' },
      { nameEn: 'Barisal', nameBn: 'বরিশাল' }, { nameEn: 'Sylhet', nameBn: 'সিলেট' },
      { nameEn: 'Rangpur', nameBn: 'রংপুর' }, { nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ' },
    ],
  });
  console.log(`✅ ${divisions.count} divisions seeded`);

  // ── Users ─────────────────────────────────────────────────
  const parentHash = await bcrypt.hash('password123', 10);
  const workerHash = await bcrypt.hash('worker123', 10);

  const sarah = await prisma.user.upsert({
    where: { phone: '01712345678' },
    update: {},
    create: {
      fullNameEn: 'Sarah Ahmed',
      fullNameBn: 'সারাহ আহমেদ',
      phone: '01712345678',
      email: 'sarah@shishucare.app',
      password: parentHash,
      role: 'parent',
    },
  });

  const karim = await prisma.user.upsert({
    where: { phone: '01812345678' },
    update: {},
    create: {
      fullNameEn: 'Dr. Karim Rahman',
      fullNameBn: 'ডা. করিম রহমান',
      phone: '01812345678',
      email: 'karim@shishucare.app',
      password: workerHash,
      role: 'health_worker',
    },
  });
  console.log(`✅ 2 users seeded`);

  // ── Child ─────────────────────────────────────────────────
  await prisma.child.deleteMany({ where: { parentId: sarah.id } });
  const aayan = await prisma.child.create({
    data: {
      parentId: sarah.id,
      name: 'Aayan',
      dateOfBirth: new Date('2025-10-09'),
      gender: 'male',
      bloodGroup: 'B+',
      birthWeightKg: 3.20,
      birthHeightCm: 50.0,
      journeyType: 'postnatal',
    },
  });
  console.log(`✅ Child "Aayan" created`);

  // ── Growth record ─────────────────────────────────────────
  await prisma.growthRecord.create({
    data: { childId: aayan.id, weightKg: 8.2, heightCm: 68.0, headCircumferenceCm: 43.0, measuredAt: new Date('2026-06-01') },
  });

  // ── Vaccination records ───────────────────────────────────
  const allVaccines = await prisma.vaccination.findMany();
  const vaccMap = Object.fromEntries(allVaccines.map(v => [v.shortName, v.id]));
  await prisma.vaccinationRecord.createMany({
    data: [
      { childId: aayan.id, vaccinationId: vaccMap['BCG'],  status: 'done', administeredAt: new Date('2025-10-09') },
      { childId: aayan.id, vaccinationId: vaccMap['HepB'], status: 'done', administeredAt: new Date('2025-10-09') },
      { childId: aayan.id, vaccinationId: vaccMap['OPV'],  status: 'done', administeredAt: new Date('2025-10-09') },
      { childId: aayan.id, vaccinationId: vaccMap['Penta'],status: 'done', administeredAt: new Date('2025-11-20') },
      { childId: aayan.id, vaccinationId: vaccMap['PCV'],  status: 'done', administeredAt: new Date('2025-11-20') },
      { childId: aayan.id, vaccinationId: vaccMap['MR'],   status: 'pending' },
    ],
  });

  // ── Milestone records ─────────────────────────────────────
  const allMilestones = await prisma.milestone.findMany();
  const milestoneAchieved = ['Holds head up','Smiles responsively','Follows moving objects','Coos and makes sounds','Rolls over','Reaches for objects','Laughs out loud','Sits with support','Responds to name'];
  await prisma.milestoneRecord.createMany({
    data: allMilestones.slice(0, 11).map((m, i) => ({
      childId: aayan.id,
      milestoneId: m.id,
      achieved: milestoneAchieved.includes(m.label),
      achievedAt: milestoneAchieved.includes(m.label) ? new Date(`2026-0${Math.min(i + 1, 9)}-10`) : null,
    })),
  });

  // ── Today's care checklist ────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.careLog.createMany({
    data: [
      { childId: aayan.id, label: 'Morning Feeding', done: true,  scheduledTime: '07:30', logDate: today },
      { childId: aayan.id, label: 'Vitamin D Drops', done: true,  scheduledTime: '08:00', logDate: today },
      { childId: aayan.id, label: 'Tummy Time',      done: false, scheduledTime: '10:00', logDate: today },
      { childId: aayan.id, label: 'Afternoon Nap',   done: false, scheduledTime: '14:00', logDate: today },
    ],
  });

  // ── Feeding logs ──────────────────────────────────────────
  const loggedAt = new Date();
  loggedAt.setHours(7, 30, 0, 0);
  await prisma.feedingLog.createMany({
    data: [
      { childId: aayan.id, type: 'breastfeed', durationMinutes: 15, side: 'left',  loggedAt },
      { childId: aayan.id, type: 'breastfeed', durationMinutes: 12, side: 'right', loggedAt: new Date(loggedAt.getTime() + 3.25 * 3600000) },
      { childId: aayan.id, type: 'bottle',     amountMl: 120,       loggedAt: new Date(loggedAt.getTime() + 6 * 3600000) },
    ],
  });

  // ── Sleep logs ────────────────────────────────────────────
  const sleepBase = new Date();
  sleepBase.setHours(9, 15, 0, 0);
  await prisma.sleepLog.createMany({
    data: [
      { childId: aayan.id, sleepStart: sleepBase, sleepEnd: new Date(sleepBase.getTime() + 75 * 60000), durationMinutes: 75 },
      { childId: aayan.id, sleepStart: new Date(sleepBase.getTime() + 4.75 * 3600000), sleepEnd: new Date(sleepBase.getTime() + 6.75 * 3600000), durationMinutes: 120 },
    ],
  });

  console.log('\n✅ Database seeded successfully!\n');
  console.log('─────────────────────────────────────────');
  console.log('  TEST LOGIN CREDENTIALS');
  console.log('─────────────────────────────────────────');
  console.log('  Parent account:');
  console.log('    Phone:    01712345678');
  console.log('    Password: password123');
  console.log('');
  console.log('  Health Worker account:');
  console.log('    Phone:    01812345678');
  console.log('    Password: worker123');
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
