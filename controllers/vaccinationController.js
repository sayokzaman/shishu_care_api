var prismaWrapper = require('../lib/prisma')

async function resolveChild(client, userId, childId) {
    var parent = await client.parent.findUnique({ where: { userId: parseInt(userId) } })
    if (!parent) return null
    if (childId) {
        return await client.child.findFirst({ where: { id: childId, parentId: parent.id } })
    }
    return await client.child.findFirst({ where: { parentId: parent.id }, orderBy: { createdAt: 'desc' } })
}

// GET /api/vaccinations?childId=X
// Auto-initializes ChildVaccination records on first access for a child with a known DOB.
exports.listVaccinations = async function (req, res, next) {
    try {
        var client = prismaWrapper._getClient()
        var childId = req.query.childId ? parseInt(req.query.childId) : null
        var child = await resolveChild(client, req.userId, childId)
        if (!child) return res.status(404).json({ message: 'No child profile found' })

        var existing = await client.childVaccination.count({ where: { childId: child.id } })
        if (existing === 0 && child.dateOfBirth) {
            var allDoses = await client.vaccineDose.findMany()
            var dob = new Date(child.dateOfBirth)
            await client.childVaccination.createMany({
                data: allDoses.map(function (dose) {
                    var scheduledDate = new Date(dob.getTime() + dose.eligibleAgeDays * 24 * 60 * 60 * 1000)
                    return {
                        childId: child.id,
                        vaccineDoseId: dose.id,
                        scheduledDate,
                        isGiven: false,
                    }
                }),
            })
        }

        var records = await client.childVaccination.findMany({
            where: { childId: child.id },
            include: {
                vaccineDose: {
                    include: { vaccine: true },
                },
            },
            orderBy: { scheduledDate: 'asc' },
        })

        res.json({ records, childId: child.id })
    } catch (err) {
        next(err)
    }
}

// PATCH /api/vaccinations/:id  { givenDate: string, facilityName?: string }
// Records a vaccination as given. Cannot be undone once recorded.
exports.recordVaccination = async function (req, res, next) {
    try {
        var client = prismaWrapper._getClient()
        var id = parseInt(req.params.id)

        var parent = await client.parent.findUnique({ where: { userId: req.userId } })
        if (!parent) return res.status(403).json({ message: 'Not authorized' })

        var record = await client.childVaccination.findFirst({
            where: { id, child: { parentId: parent.id } },
        })
        if (!record) return res.status(404).json({ message: 'Vaccination record not found' })
        if (record.isGiven) return res.status(409).json({ message: 'Vaccination already recorded and cannot be changed' })

        var { givenDate, facilityName } = req.body
        if (!givenDate) return res.status(400).json({ message: 'givenDate is required' })

        var parsedDate = new Date(givenDate)
        if (isNaN(parsedDate.getTime())) return res.status(400).json({ message: 'givenDate is not a valid date' })

        var updated = await client.childVaccination.update({
            where: { id },
            data: {
                isGiven: true,
                givenDate: parsedDate,
                facilityName: facilityName || null,
            },
            include: {
                vaccineDose: { include: { vaccine: true } },
            },
        })

        res.json(updated)
    } catch (err) {
        next(err)
    }
}
