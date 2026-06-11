var prismaWrapper = require('../lib/prisma')

async function resolveChild(client, userId, childId) {
    var parent = await client.parent.findUnique({ where: { userId: parseInt(userId) } })
    if (!parent) return null

    if (childId) {
        return await client.child.findFirst({ where: { id: childId, parentId: parent.id } })
    }
    return await client.child.findFirst({ where: { parentId: parent.id }, orderBy: { createdAt: 'desc' } })
}

// GET /api/feeding/sessions?date=YYYY-MM-DD&childId=X
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

        var sessions = await client.feedingSession.findMany({
            where: { childId: child.id, fedAt: { gte: startOfDay, lte: endOfDay } },
            include: { items: true },
            orderBy: { fedAt: 'asc' },
        })

        res.json({ sessions, childId: child.id })
    } catch (err) {
        next(err)
    }
}

// POST /api/feeding/sessions
exports.createSession = async function (req, res, next) {
    try {
        var client = prismaWrapper._getClient()
        var {
            childId, fedAt, method, breastSide, durationMinutes, amountMl,
            mood, appetite, vomitedAfter, choked, allergicReaction, notes, items,
        } = req.body

        var child = await resolveChild(client, req.userId, childId || null)
        if (!child) return res.status(422).json({ message: 'No child profile found. Please complete onboarding first.' })

        var session = await client.feedingSession.create({
            data: {
                childId: child.id,
                loggedBy: req.userId,
                fedAt: new Date(fedAt),
                method,
                breastSide: breastSide || null,
                durationMinutes: durationMinutes || null,
                amountMl: amountMl || null,
                mood: mood || null,
                appetite: appetite || null,
                vomitedAfter: vomitedAfter || false,
                choked: choked || false,
                allergicReaction: allergicReaction || false,
                notes: notes || null,
                items: {
                    create: (items || []).map(function (item) {
                        return {
                            foodNameBn: item.foodNameBn,
                            foodNameEn: item.foodNameEn || null,
                            category: item.category,
                            consistency: item.consistency || null,
                            amountGrams: item.amountGrams || null,
                            amountMl: item.amountMl || null,
                            amountDescription: item.amountDescription || null,
                            isNewFood: item.isNewFood || false,
                            accepted: item.accepted !== undefined ? item.accepted : null,
                            reaction: item.reaction || null,
                        }
                    }),
                },
            },
            include: { items: true },
        })

        res.status(201).json(session)
    } catch (err) {
        next(err)
    }
}
