require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const { seedLocations } = require('./seeders/locations')
const { seedVaccines } = require('./seeders/vaccines')
const { seedUsers } = require('./seeders/users')

const prisma = new PrismaClient()

async function main() {
  await seedLocations(prisma)
  console.log()
  await seedVaccines(prisma)
  console.log()
  await seedUsers(prisma)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
