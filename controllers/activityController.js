var prismaWrapper = require('../lib/prisma')

async function resolveChild(client, userId, childId) {
    var parent = await client.parent.findUnique({ where: { userId: parseInt(userId) } })
    if (!parent) return null
    if (childId) {
        return await client.child.findFirst({ where: { id: childId, parentId: parent.id } })
    }
    return await client.child.findFirst({ where: { parentId: parent.id }, orderBy: { createdAt: 'desc' } })
}

// GET /api/activities/sessions?date=YYYY-MM-DD&childId=X
exports.listSessions = async function (req, res, next) {
    try {
        var client = prismaWrapper._getClient()
        var childId = req.query.childId ? parseInt(req.query.childId) : null

        var child = await resolveChild(client, req.userId, childId)
        if (!child) return res.json({ sessions: [], childId: null })

        var filterDate = req.query.date ? new Date(req.query.date) : new Date()
        var startOfDay = new Date(filterDate)
        startOfDay.setHours(0, 0, 0, 0)
        var endOfDay = new Date(filterDate)
        endOfDay.setHours(23, 59, 59, 999)

        var sessions = await client.activitySession.findMany({
            where: { childId: child.id, startedAt: { gte: startOfDay, lte: endOfDay } },
            orderBy: { startedAt: 'asc' },
        })

        res.json({ sessions, childId: child.id })
    } catch (err) {
        next(err)
    }
}

// POST /api/activities/sessions
exports.createSession = async function (req, res, next) {
    try {
        var client = prismaWrapper._getClient()
        var { childId, startedAt, durationMinutes, type, notes } = req.body

        var child = await resolveChild(client, req.userId, childId || null)
        if (!child) return res.status(422).json({ message: 'No child profile found. Please complete onboarding first.' })

        var session = await client.activitySession.create({
            data: {
                childId:         child.id,
                loggedBy:        req.userId,
                startedAt:       new Date(startedAt),
                durationMinutes: durationMinutes || null,
                type,
                notes: notes || null,
            },
        })

        res.status(201).json(session)
    } catch (err) {
        next(err)
    }
}
