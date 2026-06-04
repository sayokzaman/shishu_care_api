const express = require('express')
const router = express.Router()
const { prisma } = require('../lib/db')
const { initializeVaccinationSchedule, fromJsonField } = require('../lib/db-helpers')
const auth = require('../middleware/authMiddleware')

// POST /api/child - Create a child
router.post('/', auth.required, async function (req, res, next) {
  try {
    const {
      parentId,
      name,
      sex,
      dateOfBirth,
      expectedDueDate,
      birthWeight,
      knownConditions,
      guardianName,
      guardianPhone
    } = req.body

    if (!parentId || !name || !sex) {
      return res.status(400).json({ message: 'parentId, name and sex are required' })
    }

    const child = await prisma.child.create({
      data: {
        parentId,
        name,
        sex,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        expectedDueDate: expectedDueDate ? new Date(expectedDueDate) : null,
        birthWeight: birthWeight ? parseFloat(birthWeight) : null,
        knownConditions: knownConditions || null,
        guardianName: guardianName || null,
        guardianPhone: guardianPhone || null,
      },
    })

    // If child is postnatal (has DOB), initialize the vaccination schedule
    if (child.dateOfBirth) {
      await initializeVaccinationSchedule(child.id, child.dateOfBirth)
    }

    res.status(201).json(child)
  } catch (error) {
    next(error)
  }
})

// PATCH /api/child/:id - Update child (handles EDD -> DOB transition at birth)
router.patch('/:id', auth.required, async function (req, res, next) {
  try {
    const { id } = req.params
    const body = req.body

    const updateData = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.sex !== undefined) updateData.sex = body.sex
    if (body.birthWeight !== undefined) updateData.birthWeight = body.birthWeight ? parseFloat(body.birthWeight) : null
    if (body.knownConditions !== undefined) updateData.knownConditions = body.knownConditions || null
    if (body.guardianName !== undefined) updateData.guardianName = body.guardianName || null
    if (body.guardianPhone !== undefined) updateData.guardianPhone = body.guardianPhone || null
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive
      if (body.isActive === false) {
        updateData.deletedAt = new Date()
      } else {
        updateData.deletedAt = null
      }
    }

    // Handle EDD -> DOB transition
    if (body.dateOfBirth) {
      updateData.dateOfBirth = new Date(body.dateOfBirth)
      updateData.expectedDueDate = null
    }

    const updated = await prisma.child.update({
      where: { id },
      data: updateData,
    })

    // Initialise vaccination schedule if transitioning to postnatal and not already created
    if (updated.dateOfBirth) {
      const existingCount = await prisma.vaccinationRecord.count({
        where: { childId: id },
      })
      if (existingCount === 0) {
        await initializeVaccinationSchedule(updated.id, updated.dateOfBirth)
      }
    }

    res.json(updated)
  } catch (error) {
    next(error)
  }
})

// GET /api/child/:id - Fetch child with all sub-records
router.get('/:id', auth.required, async function (req, res, next) {
  try {
    const { id } = req.params

    const child = await prisma.child.findUnique({
      where: { id, isActive: true },
      include: {
        vaccinationRecords: { orderBy: { scheduledDate: 'asc' } },
        milestoneRecords:   { orderBy: { ageGroup: 'asc' } },
        growthRecords:      { orderBy: { date: 'asc' } },      // asc required for Recharts
        symptomChecks:      { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })

    if (!child) {
      return res.status(404).json({ error: 'Not found' })
    }

    // Enrich vaccination records with computed overdue flag
    const now = new Date()
    const enrichedVaccinations = child.vaccinationRecords.map((v) => ({
      ...v,
      overdue: v.status === 'scheduled' && new Date(v.scheduledDate) < now,
    }))

    // Parse JSON fields on symptomChecks
    const enrichedChecks = child.symptomChecks.map((c) => ({
      ...c,
      symptoms:      fromJsonField(c.symptoms),
      bulletPointsEn: fromJsonField(c.bulletPointsEn),
      bulletPointsBn: fromJsonField(c.bulletPointsBn),
    }))

    res.json({
      ...child,
      vaccinationRecords: enrichedVaccinations,
      symptomChecks: enrichedChecks,
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/child/parent/:parentId - List all active children for a parent
// (Mapping route format `GET /api/parent/[id]/children` to this file is clean)
router.get('/parent/:parentId', auth.required, async function (req, res, next) {
  try {
    const { parentId } = req.params

    const children = await prisma.child.findMany({
      where: { parentId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })

    res.json(children)
  } catch (error) {
    next(error)
  }
})

module.exports = router
