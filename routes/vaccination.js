const express = require('express')
const router = express.Router()
const { prisma } = require('../lib/db')
const { markVaccineReceived } = require('../lib/db-helpers')
const auth = require('../middleware/authMiddleware')

// GET /api/vaccination/:childId - List all vaccination records for a child
router.get('/:childId', auth.required, async function (req, res, next) {
  try {
    const { childId } = req.params

    const records = await prisma.vaccinationRecord.findMany({
      where: { childId },
      orderBy: { scheduledDate: 'asc' },
    })

    // Inject computed overdue flag — not stored in DB
    const now = new Date()
    const enriched = records.map((v) => ({
      ...v,
      overdue: v.status === 'scheduled' && new Date(v.scheduledDate) < now,
    }))

    res.json(enriched)
  } catch (error) {
    next(error)
  }
})

// POST /api/vaccination/:recordId/receive - Mark a vaccination dose as received
router.post('/:recordId/receive', auth.required, async function (req, res, next) {
  try {
    const { recordId } = req.params
    const { childId, lotNumber, batchId } = req.body

    if (!childId) {
      return res.status(400).json({ error: 'childId is required in request body' })
    }

    // Look up parent's phone number from session (req.user.id is sub in JWT)
    const parent = await prisma.parent.findUnique({
      where: { id: req.user.id }
    })

    if (!parent) {
      return res.status(404).json({ error: 'Parent/CHW account not found' })
    }

    const updated = await markVaccineReceived(
      recordId,
      childId,
      parent.phone,
      { lotNumber, batchId }
    )

    res.json(updated)
  } catch (error) {
    next(error)
  }
})

module.exports = router
