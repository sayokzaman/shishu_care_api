const express = require('express')
const router = express.Router()
const { prisma } = require('../lib/db')

// GET /api/sms-reminders - Polled by n8n to pick up queued reminders
router.get('/', async function (req, res, next) {
  try {
    const dueReminders = await prisma.smsReminder.findMany({
      where: {
        status: 'queued',
        scheduledSendAt: { lte: new Date() },
      },
      orderBy: { scheduledSendAt: 'asc' },
      take: 50, // process in batches of 50
    })

    res.json({ reminders: dueReminders, count: dueReminders.length })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/sms-reminders/:id - Called by n8n after sending or on failure
router.patch('/:id', async function (req, res, next) {
  try {
    const { id } = req.params
    const { status, sentAt, errorMessage, retryCount } = req.body

    const allowed = ['sent', 'failed', 'cancelled']
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const updated = await prisma.smsReminder.update({
      where: { id },
      data: {
        status,
        sentAt: sentAt ? new Date(sentAt) : null,
        errorMessage: errorMessage || null,
        retryCount: retryCount !== undefined ? parseInt(retryCount) : undefined,
      },
    })

    res.json(updated)
  } catch (error) {
    next(error)
  }
})

module.exports = router
