var prismaWrapper = require('../lib/prisma')

async function resolveChild(client, userId, childId) {
    var parent = await client.parent.findUnique({ where: { userId: parseInt(userId) } })
    if (!parent) return null
    if (childId) {
        return await client.child.findFirst({ where: { id: childId, parentId: parent.id } })
    }
    return await client.child.findFirst({ where: { parentId: parent.id }, orderBy: { createdAt: 'desc' } })
}

// GET /api/milestones?ageBracket=1-6m&childId=X
// Returns milestone list for the bracket with the child's progress merged in
exports.listForBracket = async function (req, res, next) {
    try {
        var client = prismaWrapper._getClient()
        var ageBracket = req.query.ageBracket
        if (!ageBracket) return res.status(400).json({ message: 'ageBracket query param is required' })

        var childId = req.query.childId ? parseInt(req.query.childId) : null
        var child = await resolveChild(client, req.userId, childId)

        var milestones = await client.milestone.findMany({
            where: { ageBracket },
            orderBy: { sortOrder: 'asc' },
        })

        if (!child) {
            return res.json({ milestones: milestones.map(function (m) { return Object.assign({}, m, { isAchieved: false, childMilestoneId: null, notes: null, flagged: false }) }), childId: null })
        }

        var progress = await client.childMilestone.findMany({
            where: { childId: child.id, milestoneId: { in: milestones.map(function (m) { return m.id }) } },
        })

        var progressMap = {}
        progress.forEach(function (p) { progressMap[p.milestoneId] = p })

        var enriched = milestones.map(function (m) {
            var p = progressMap[m.id]
            return Object.assign({}, m, {
                isAchieved:       p ? p.isAchieved : false,
                childMilestoneId: p ? p.id : null,
                notes:            p ? p.notes : null,
                flagged:          p ? p.flagged : false,
                achievedAt:       p ? p.achievedAt : null,
            })
        })

        res.json({ milestones: enriched, childId: child.id })
    } catch (err) {
        next(err)
    }
}

// PATCH /api/milestones/:milestoneId/toggle  — upserts ChildMilestone
exports.toggle = async function (req, res, next) {
    try {
        var client = prismaWrapper._getClient()
        var milestoneId = parseInt(req.params.milestoneId)

        var child = await resolveChild(client, req.userId, req.body.childId || null)
        if (!child) return res.status(422).json({ message: 'No child profile found. Please complete onboarding first.' })

        var milestone = await client.milestone.findUnique({ where: { id: milestoneId } })
        if (!milestone) return res.status(404).json({ message: 'Milestone not found' })

        var existing = await client.childMilestone.findUnique({
            where: { childId_milestoneId: { childId: child.id, milestoneId } },
        })

        var isAchieved = existing ? !existing.isAchieved : true

        var record = await client.childMilestone.upsert({
            where: { childId_milestoneId: { childId: child.id, milestoneId } },
            create: {
                childId:    child.id,
                milestoneId,
                isAchieved,
                achievedAt: isAchieved ? new Date() : null,
                checkedBy:  req.userId,
            },
            update: {
                isAchieved,
                achievedAt: isAchieved ? new Date() : null,
                checkedBy:  req.userId,
            },
        })

        res.json(record)
    } catch (err) {
        next(err)
    }
}

// PATCH /api/milestones/:milestoneId/flag  — toggle flagged concern
exports.flag = async function (req, res, next) {
    try {
        var client = prismaWrapper._getClient()
        var milestoneId = parseInt(req.params.milestoneId)

        var child = await resolveChild(client, req.userId, req.body.childId || null)
        if (!child) return res.status(422).json({ message: 'No child profile found.' })

        var existing = await client.childMilestone.findUnique({
            where: { childId_milestoneId: { childId: child.id, milestoneId } },
        })

        var record = await client.childMilestone.upsert({
            where: { childId_milestoneId: { childId: child.id, milestoneId } },
            create: { childId: child.id, milestoneId, isAchieved: false, flagged: true, checkedBy: req.userId },
            update: { flagged: existing ? !existing.flagged : true, checkedBy: req.userId },
        })

        res.json(record)
    } catch (err) {
        next(err)
    }
}
