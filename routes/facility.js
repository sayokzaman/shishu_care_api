const express = require('express')
const router = express.Router()
const { prisma } = require('../lib/db')
const { getFacilitiesForUrgency } = require('../lib/db-helpers')
const auth = require('../middleware/authMiddleware')

// GET /api/facility - MCP-style tool endpoint
router.get('/', auth.optional, async function (req, res, next) {
  try {
    const urgency = Number(req.query.urgency || '3')
    const division = req.query.division || undefined
    const district = req.query.district || undefined
    const upazila = req.query.upazila || undefined

    const results = await getFacilitiesForUrgency({
      urgencyLevel: urgency,
      division,
      district,
      upazila
    })

    res.json({
      tool: 'facility_lookup',
      parameters: { urgency, division, district, upazila },
      results,
      count: results.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/facility/:id - Facility admin updates availability
router.patch('/:id', auth.required, async function (req, res, next) {
  try {
    const { id } = req.params

    // Row-level security check: verify the authenticated admin owns this facility
    // req.user.id is set by authMiddleware from the JWT sub payload
    const admin = await prisma.facilityAdmin.findUnique({
      where: { id: req.user.id },
    })

    if (!admin || admin.facilityId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { beds, oxygenAvailable, pediatricUnit, powerBackup } = req.body

    const updated = await prisma.facility.update({
      where: { id },
      data: {
        ...(beds !== undefined ? { beds: beds !== null ? parseInt(beds) : null } : {}),
        ...(oxygenAvailable !== undefined ? { oxygenAvailable: !!oxygenAvailable } : {}),
        ...(pediatricUnit !== undefined ? { pediatricUnit: !!pediatricUnit } : {}),
        ...(powerBackup !== undefined ? { powerBackup: !!powerBackup } : {}),
        lastUpdatedAt: new Date(), // always refresh the timestamp
      },
    })

    res.json({
      ...updated,
      staleWarning: false, // just updated — cannot be stale
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
