var prismaWrapper = require('../lib/prisma')

async function resolveChild(client, userId, childId) {
    var parent = await client.parent.findUnique({ where: { userId: parseInt(userId) } })
    if (!parent) return null
    if (childId) {
        return await client.child.findFirst({ where: { id: childId, parentId: parent.id } })
    }
    return await client.child.findFirst({ where: { parentId: parent.id }, orderBy: { createdAt: 'desc' } })
}

function ageDays(dob) {
    return Math.floor((Date.now() - new Date(dob).getTime()) / (24 * 60 * 60 * 1000))
}

// GET /api/growth/latest?childId=X
exports.getLatest = async function (req, res, next) {
    try {
        var client = prismaWrapper._getClient()
        var childId = req.query.childId ? parseInt(req.query.childId) : null

        var child = await resolveChild(client, req.userId, childId)
        if (!child) return res.json({ measurement: null, childId: null })

        var measurement = await client.growthMeasurement.findFirst({
            where: { childId: child.id },
            orderBy: { measuredAt: 'desc' },
        })

        res.json({ measurement, childId: child.id })
    } catch (err) {
        next(err)
    }
}

// GET /api/growth/measurements?childId=X  (history list)
exports.listMeasurements = async function (req, res, next) {
    try {
        var client = prismaWrapper._getClient()
        var childId = req.query.childId ? parseInt(req.query.childId) : null

        var child = await resolveChild(client, req.userId, childId)
        if (!child) return res.json({ measurements: [], childId: null })

        var measurements = await client.growthMeasurement.findMany({
            where: { childId: child.id },
            orderBy: { measuredAt: 'desc' },
        })

        res.json({ measurements, childId: child.id })
    } catch (err) {
        next(err)
    }
}

// POST /api/growth/measurements
exports.createMeasurement = async function (req, res, next) {
    try {
        var client = prismaWrapper._getClient()
        var { childId, measuredAt, weightKg, heightCm, headCircumferenceCm, notes } = req.body

        var child = await resolveChild(client, req.userId, childId || null)
        if (!child) return res.status(422).json({ message: 'No child profile found. Please complete onboarding first.' })

        var at = measuredAt ? new Date(measuredAt) : new Date()
        var days = child.dateOfBirth ? ageDays(child.dateOfBirth) : 0

        var measurement = await client.growthMeasurement.create({
            data: {
                childId:             child.id,
                measuredBy:          req.userId,
                measuredAt:          at,
                ageDays:             days,
                weightKg:            weightKg || 0,
                heightCm:            heightCm || 0,
                headCircumferenceCm: headCircumferenceCm || null,
                notes:               notes || null,
            },
        })

        res.status(201).json(measurement)
    } catch (err) {
        next(err)
    }
}
