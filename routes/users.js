const express = require('express')
const router = express.Router()
const { prisma } = require('../lib/db')
const auth = require('../middleware/authMiddleware')

// GET /api/users - List parents (accessible optionally or by authenticated accounts)
router.get('/', auth.optional, async function (req, res, next) {
  try {
    const parents = await prisma.parent.findMany({
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      parents: parents.map(function (p) {
        return {
          id: p.id,
          phone: p.phone,
          language: p.language,
          role: p.role,
          division: p.division,
          district: p.district,
          upazila: p.upazila,
          created_at: p.createdAt
        }
      })
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
