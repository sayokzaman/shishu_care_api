const { PrismaClient } = require('@prisma/client')
const { facilities } = require('../data/facilities')

const prisma = new PrismaClient()

// Map static facility types to schema type strings
function mapFacilityType(type) {
  const map = {
    chw: 'chw_post',
    'chw-post': 'chw_post',
    uhc: 'upazila_hc',
    upazila: 'upazila_hc',
    'upazila-hc': 'upazila_hc',
    district: 'district_hospital',
    'district-hospital': 'district_hospital',
    'medical_college': 'medical_college',
    'medical-college': 'medical_college',
    tertiary: 'tertiary',
  }
  return map[type.toLowerCase()] || type
}

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
        nameBn: f.name ?? null, // using Bangla name for nameBn if not provided
        type: mapFacilityType(f.type),
        division: f.division,
        district: f.district,
        upazila: f.upazila || null,
        address: f.address || null,
        addressBn: f.address || null,
        phone: f.phone || null,
        latitude: f.latitude || null,
        longitude: f.longitude || null,
        beds: f.bedsTotal || null,
        oxygenAvailable: f.hasOxygen || false,
        pediatricUnit: f.hasPediatric || false,
        powerBackup: f.hasPower || false,
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

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
