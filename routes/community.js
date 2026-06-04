const express = require('express')
const router = express.Router()
const { prisma } = require('../lib/db')
const auth = require('../middleware/authMiddleware')

// GET /api/community - Get upazila-filtered forum feed
router.get('/', auth.optional, async function (req, res, next) {
  try {
    const upazila = req.query.upazila || undefined
    const page = Number(req.query.page || '1')
    const take = 20

    const posts = await prisma.communityPost.findMany({
      where: {
        isVisible: true,
        ...(upazila ? { upazila } : {}),
      },
      include: {
        author: {
          select: {
            role: true,
            upazila: true
          }
        }, // never expose phone
      },
      orderBy: [{ upvotes: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * take,
      take,
    })

    res.json(posts)
  } catch (error) {
    next(error)
  }
})

// POST /api/community - Create a community post
router.post('/', auth.required, async function (req, res, next) {
  try {
    const { content } = req.body

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' })
    }
    if (content.length > 500) {
      return res.status(400).json({ error: 'Content must be 500 characters or fewer' })
    }

    // Look up parent/author from session (req.user.id)
    const parent = await prisma.parent.findUnique({
      where: { id: req.user.id }
    })

    if (!parent) {
      return res.status(404).json({ error: 'Parent/CHW account not found' })
    }

    const post = await prisma.communityPost.create({
      data: {
        authorId: parent.id,
        content: content.trim(),
        division: parent.division || null,
        district: parent.district || null,
        upazila:  parent.upazila  || null,
        isModerated: false,
        isVisible: true,
      },
    })

    res.status(201).json(post)
  } catch (error) {
    next(error)
  }
})

// POST /api/community/:id/upvote - Upvote a post (helpful extension for forum features)
router.post('/:id/upvote', auth.optional, async function (req, res, next) {
  try {
    const { id } = req.params

    const post = await prisma.communityPost.update({
      where: { id },
      data: {
        upvotes: { increment: 1 }
      }
    })

    res.json(post)
  } catch (error) {
    next(error)
  }
})

module.exports = router
