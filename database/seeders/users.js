const bcrypt = require('bcryptjs')

const userData = [
  {
    phone: '01711000001',
    fullNameBn: 'রহিম উদ্দিন',
    fullNameEn: 'Rahim Uddin',
    role: 'admin',
    onboarded: true,
  },
  {
    phone: '01711000002',
    fullNameBn: 'সুমাইয়া বেগম',
    fullNameEn: 'Sumaiya Begum',
    role: 'parent',
    onboarded: true,
  },
  {
    phone: '01711000003',
    fullNameBn: 'করিম হোসেন',
    fullNameEn: 'Karim Hossain',
    role: 'parent',
    onboarded: false,
  },
  {
    phone: '01711000004',
    fullNameBn: 'নাসরিন আক্তার',
    fullNameEn: 'Nasrin Akter',
    role: 'health_worker',
    onboarded: true,
  },
  {
    phone: '01711000005',
    fullNameBn: 'মোঃ আরিফ হোসেন',
    fullNameEn: 'Md. Arif Hossain',
    role: 'health_worker',
    onboarded: true,
  },
]

async function seedUsers(prisma) {
  console.log('Seeding users...')

  const existing = await prisma.user.count()
  if (existing > 0) {
    console.log(`  Users already seeded (${existing} found), skipping.`)
    return
  }

  const passwordHash = await bcrypt.hash('password', 10)

  for (const data of userData) {
    const user = await prisma.user.create({
      data: { ...data, password: passwordHash },
    })
    console.log(`  ✓ ${user.fullNameEn} (${user.role}) — ${user.phone}`)
  }

  console.log(`  Users: ${userData.length}`)
}

module.exports = { seedUsers }
