var prismaWrapper = require('../lib/prisma')

async function resolveChild(client, userId, childId) {
    var parent = await client.parent.findUnique({ where: { userId: parseInt(userId) } })
    if (!parent) return null
    if (childId) {
        return await client.child.findFirst({ where: { id: childId, parentId: parent.id } })
    }
    return await client.child.findFirst({ where: { parentId: parent.id }, orderBy: { createdAt: 'desc' } })
}

function durationLabel(session) {
    if (!session.endedAt) return null
    var ms = new Date(session.endedAt) - new Date(session.startedAt)
    var totalMin = Math.round(ms / 60000)
    var h = Math.floor(totalMin / 60)
    var m = totalMin % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
}

// GET /api/sleep/sessions?date=YYYY-MM-DD&childId=X
exports.listSessions = async function (req, res, next) {
    try {
        var client = prismaWrapper._getClient()
        var childId = req.query.childId ? parseInt(req.query.childId) : null

        var child = await resolveChild(client, req.userId, childId)
        if (!child) return res.json({ sessions: [], totalMinutes: 0, childId: null })

        var filterDate = req.query.date ? new Date(req.query.date) : new Date()
        var startOfDay = new Date(filterDate)
        startOfDay.setHours(0, 0, 0, 0)
        var endOfDay = new Date(filterDate)
        endOfDay.setHours(23, 59, 59, 999)

        var sessions = await client.sleepSession.findMany({
            where: { childId: child.id, startedAt: { gte: startOfDay, lte: endOfDay } },
            orderBy: { startedAt: 'asc' },
        })

        var totalMinutes = sessions.reduce(function (sum, s) {
            if (!s.endedAt) return sum
            return sum + Math.round((new Date(s.endedAt) - new Date(s.startedAt)) / 60000)
        }, 0)

        var enriched = sessions.map(function (s) {
            return Object.assign({}, s, { durationLabel: durationLabel(s) })
        })

        res.json({ sessions: enriched, totalMinutes, childId: child.id })
    } catch (err) {
        next(err)
    }
}

// POST /api/sleep/sessions
exports.createSession = async function (req, res, next) {
    try {
        var client = prismaWrapper._getClient()
        var { childId, startedAt, endedAt, type, quality, location, notes } = req.body

        var child = await resolveChild(client, req.userId, childId || null)
        if (!child) return res.status(422).json({ message: 'No child profile found. Please complete onboarding first.' })

        var session = await client.sleepSession.create({
            data: {
                childId:   child.id,
                loggedBy:  req.userId,
                startedAt: new Date(startedAt),
                endedAt:   endedAt ? new Date(endedAt) : null,
                type,
                quality:  quality || null,
                location: location || null,
                notes:    notes || null,
            },
        })

        res.status(201).json(Object.assign({}, session, { durationLabel: durationLabel(session) }))
    } catch (err) {
        next(err)
    }
}
