require('dotenv').config()

var { PrismaClient } = require('@prisma/client')

var prisma = new PrismaClient()

function getPrismaClient() {
    return prisma
}

module.exports = {
    _getClient: getPrismaClient
}
