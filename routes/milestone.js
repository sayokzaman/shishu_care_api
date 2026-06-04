const express = require('express')
const router = express.Router()
const { prisma } = require('../lib/db')
const auth = require('../middleware/authMiddleware')

// POST /api/child/:id/milestone - Upsert milestone record for a child
router.post('/:id/milestone', auth.required, async function (req, res, next) {
  try {
    const { id } = req.params
    const { milestoneId, completed, ageGroup, category, descriptionEn, descriptionBn, concernNote } = req.body

    if (!milestoneId || ageGroup === undefined || category === undefined) {
      return res.status(400).json({ error: 'milestoneId, ageGroup, and category are required' })
    }

    const milestone = await prisma.milestoneRecord.upsert({
      where: {
        childId_milestoneId: {
          childId: id,
          milestoneId: milestoneId,
        }
      },
      update: {
        completed: completed !== undefined ? !!completed : false,
        completedAt: completed ? new Date() : null,
        concernNote: concernNote || null,
      },
      create: {
        childId: id,
        milestoneId,
        ageGroup,
        category,
        descriptionEn: descriptionEn || '',
        descriptionBn: descriptionBn || '',
        completed: completed !== undefined ? !!completed : false,
        completedAt: completed ? new Date() : null,
        concernNote: concernNote || null,
      }
    })

    res.json(milestone)
  } catch (error) {
    next(error)
  }
})

module.exports = router
