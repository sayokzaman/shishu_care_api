const express = require('express')
const router = express.Router()
const { prisma } = require('../lib/db')
const { computeMuacBand, getAgeInMonths } = require('../lib/db-helpers')
const auth = require('../middleware/authMiddleware')

// POST /api/child/:id/growth - Record a growth measurement
// (Note: we can mount this directly on `/api/child` or `/api/growth`. Let's mount it on `/api/child`)
router.post('/:id/growth', auth.required, async function (req, res, next) {
  try {
    const { id } = req.params
    const { date, weight, height, muac, notes } = req.body

    const child = await prisma.child.findUnique({
      where: { id }
    })

    if (!child) {
      return res.status(404).json({ error: 'Child not found' })
    }

    const ageMonths = getAgeInMonths(child.dateOfBirth)
    const muacVal = muac ? parseFloat(muac) : null
    const muacBand = muacVal && ageMonths !== null
      ? computeMuacBand(muacVal, ageMonths)
      : null

    const record = await prisma.growthRecord.create({
      data: {
        childId: id,
        date: date ? new Date(date) : new Date(),
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        muac: muacVal,
        muacBand,                        // server-computed, not from client
        notes: notes || null,
      },
    })

    res.status(201).json(record)
  } catch (error) {
    next(error)
  }
})

module.exports = router
