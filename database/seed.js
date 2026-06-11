require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const { seedLocations } = require('./seeders/locations')
const { seedVaccines } = require('./seeders/vaccines')
const { seedUsers } = require('./seeders/users')
const { seedFeeding } = require('./seeders/feeding')
const { seedSleep } = require('./seeders/sleep')
const { seedActivities } = require('./seeders/activities')
const { seedGrowth } = require('./seeders/growth')
const { seedMilestones } = require('./seeders/milestones')

const prisma = new PrismaClient()

async function main() {
  await seedLocations(prisma)
  console.log()
  await seedVaccines(prisma)
  console.log()
  await seedUsers(prisma)
  console.log()
  await seedFeeding(prisma)
  console.log()
  await seedSleep(prisma)
  console.log()
  await seedActivities(prisma)
  console.log()
  await seedGrowth(prisma)
  console.log()
  await seedMilestones(prisma)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
