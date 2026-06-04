const { prisma } = require('./db')

function getPrismaClient() {
    return prisma
}

module.exports = {
    _getClient: getPrismaClient,
    prisma
}
