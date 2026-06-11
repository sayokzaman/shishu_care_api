var prismaWrapper = require('../lib/prisma')

function getClient(res) {
    var client = prismaWrapper && prismaWrapper._getClient()
    if (!client) {
        res.status(500).json({ message: 'Prisma client is not available' })
        return null
    }
    return client
}

// Returns a user-friendly message when a FK constraint blocks delete
function fkConflictMessage(resource) {
    return resource + ' cannot be deleted because it still has related records. Remove them first.'
}

// ── Divisions ──────────────────────────────────────────────────────────────────

exports.getDivisions = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var divisions = await client.division.findMany({
            orderBy: { nameEn: 'asc' },
            include: { _count: { select: { districts: true } } }
        })

        res.json({
            data: divisions.map(function (d) {
                return {
                    id: d.id,
                    nameEn: d.nameEn,
                    nameBn: d.nameBn,
                    districtCount: d._count.districts,
                    createdAt: d.createdAt
                }
            })
        })
    } catch (err) {
        next(err)
    }
}

exports.getDivision = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var id = parseInt(req.params.id, 10)
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' })

        var division = await client.division.findUnique({
            where: { id: id },
            include: {
                districts: {
                    orderBy: { nameEn: 'asc' },
                    include: { _count: { select: { upazilas: true } } }
                }
            }
        })

        if (!division) return res.status(404).json({ message: 'Division not found' })

        res.json({
            data: {
                id: division.id,
                nameEn: division.nameEn,
                nameBn: division.nameBn,
                createdAt: division.createdAt,
                districts: division.districts.map(function (d) {
                    return {
                        id: d.id,
                        nameEn: d.nameEn,
                        nameBn: d.nameBn,
                        upazillaCount: d._count.upazilas
                    }
                })
            }
        })
    } catch (err) {
        next(err)
    }
}

exports.createDivision = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var division = await client.division.create({
            data: { nameEn: req.body.nameEn, nameBn: req.body.nameBn }
        })

        res.status(201).json({ data: division })
    } catch (err) {
        next(err)
    }
}

exports.updateDivision = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var id = parseInt(req.params.id, 10)
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' })

        var existing = await client.division.findUnique({ where: { id: id } })
        if (!existing) return res.status(404).json({ message: 'Division not found' })

        var division = await client.division.update({
            where: { id: id },
            data: req.body
        })

        res.json({ data: division })
    } catch (err) {
        next(err)
    }
}

exports.deleteDivision = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var id = parseInt(req.params.id, 10)
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' })

        var existing = await client.division.findUnique({ where: { id: id } })
        if (!existing) return res.status(404).json({ message: 'Division not found' })

        await client.division.delete({ where: { id: id } })

        res.json({ message: 'Division deleted' })
    } catch (err) {
        if (err.code === 'P2003' || err.code === 'P2014') {
            return res.status(409).json({ message: fkConflictMessage('Division') })
        }
        next(err)
    }
}

// ── Districts ─────────────────────────────────────────────────────────────────

exports.getDistricts = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var where = {}
        if (req.query.divisionId) {
            var divId = parseInt(req.query.divisionId, 10)
            if (isNaN(divId)) return res.status(400).json({ message: 'Invalid divisionId' })
            where.divisionId = divId
        }

        var districts = await client.district.findMany({
            where: where,
            orderBy: { nameEn: 'asc' },
            include: {
                division: { select: { id: true, nameEn: true, nameBn: true } },
                _count: { select: { upazilas: true } }
            }
        })

        res.json({
            data: districts.map(function (d) {
                return {
                    id: d.id,
                    nameEn: d.nameEn,
                    nameBn: d.nameBn,
                    divisionId: d.divisionId,
                    division: d.division,
                    upazillaCount: d._count.upazilas,
                    createdAt: d.createdAt
                }
            })
        })
    } catch (err) {
        next(err)
    }
}

exports.getDistrict = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var id = parseInt(req.params.id, 10)
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' })

        var district = await client.district.findUnique({
            where: { id: id },
            include: {
                division: { select: { id: true, nameEn: true, nameBn: true } },
                upazilas: { orderBy: { nameEn: 'asc' } }
            }
        })

        if (!district) return res.status(404).json({ message: 'District not found' })

        res.json({ data: district })
    } catch (err) {
        next(err)
    }
}

exports.createDistrict = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var divisionExists = await client.division.findUnique({ where: { id: req.body.divisionId } })
        if (!divisionExists) return res.status(404).json({ message: 'Division not found' })

        var district = await client.district.create({
            data: {
                nameEn: req.body.nameEn,
                nameBn: req.body.nameBn,
                divisionId: req.body.divisionId
            },
            include: {
                division: { select: { id: true, nameEn: true, nameBn: true } }
            }
        })

        res.status(201).json({ data: district })
    } catch (err) {
        next(err)
    }
}

exports.updateDistrict = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var id = parseInt(req.params.id, 10)
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' })

        var existing = await client.district.findUnique({ where: { id: id } })
        if (!existing) return res.status(404).json({ message: 'District not found' })

        if (req.body.divisionId) {
            var divisionExists = await client.division.findUnique({ where: { id: req.body.divisionId } })
            if (!divisionExists) return res.status(404).json({ message: 'Division not found' })
        }

        var district = await client.district.update({
            where: { id: id },
            data: req.body,
            include: {
                division: { select: { id: true, nameEn: true, nameBn: true } }
            }
        })

        res.json({ data: district })
    } catch (err) {
        next(err)
    }
}

exports.deleteDistrict = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var id = parseInt(req.params.id, 10)
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' })

        var existing = await client.district.findUnique({ where: { id: id } })
        if (!existing) return res.status(404).json({ message: 'District not found' })

        await client.district.delete({ where: { id: id } })

        res.json({ message: 'District deleted' })
    } catch (err) {
        if (err.code === 'P2003' || err.code === 'P2014') {
            return res.status(409).json({ message: fkConflictMessage('District') })
        }
        next(err)
    }
}

// ── Upazilas ──────────────────────────────────────────────────────────────────

exports.getUpazilas = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var where = {}
        if (req.query.districtId) {
            var distId = parseInt(req.query.districtId, 10)
            if (isNaN(distId)) return res.status(400).json({ message: 'Invalid districtId' })
            where.districtId = distId
        }
        if (req.query.divisionId) {
            var divId = parseInt(req.query.divisionId, 10)
            if (isNaN(divId)) return res.status(400).json({ message: 'Invalid divisionId' })
            where.district = { divisionId: divId }
        }

        var upazilas = await client.upazilla.findMany({
            where: where,
            orderBy: { nameEn: 'asc' },
            include: {
                district: {
                    select: {
                        id: true,
                        nameEn: true,
                        nameBn: true,
                        division: { select: { id: true, nameEn: true, nameBn: true } }
                    }
                }
            }
        })

        res.json({ data: upazilas })
    } catch (err) {
        next(err)
    }
}

exports.getUpazilla = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var id = parseInt(req.params.id, 10)
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' })

        var upazilla = await client.upazilla.findUnique({
            where: { id: id },
            include: {
                district: {
                    include: {
                        division: { select: { id: true, nameEn: true, nameBn: true } }
                    }
                }
            }
        })

        if (!upazilla) return res.status(404).json({ message: 'Upazilla not found' })

        res.json({ data: upazilla })
    } catch (err) {
        next(err)
    }
}

exports.createUpazilla = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var districtExists = await client.district.findUnique({ where: { id: req.body.districtId } })
        if (!districtExists) return res.status(404).json({ message: 'District not found' })

        var upazilla = await client.upazilla.create({
            data: {
                nameEn: req.body.nameEn,
                nameBn: req.body.nameBn,
                districtId: req.body.districtId,
                isUrban: req.body.isUrban || false
            },
            include: {
                district: { select: { id: true, nameEn: true, nameBn: true } }
            }
        })

        res.status(201).json({ data: upazilla })
    } catch (err) {
        next(err)
    }
}

exports.updateUpazilla = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var id = parseInt(req.params.id, 10)
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' })

        var existing = await client.upazilla.findUnique({ where: { id: id } })
        if (!existing) return res.status(404).json({ message: 'Upazilla not found' })

        if (req.body.districtId) {
            var districtExists = await client.district.findUnique({ where: { id: req.body.districtId } })
            if (!districtExists) return res.status(404).json({ message: 'District not found' })
        }

        var upazilla = await client.upazilla.update({
            where: { id: id },
            data: req.body,
            include: {
                district: { select: { id: true, nameEn: true, nameBn: true } }
            }
        })

        res.json({ data: upazilla })
    } catch (err) {
        next(err)
    }
}

exports.deleteUpazilla = async function (req, res, next) {
    try {
        var client = getClient(res)
        if (!client) return

        var id = parseInt(req.params.id, 10)
        if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' })

        var existing = await client.upazilla.findUnique({ where: { id: id } })
        if (!existing) return res.status(404).json({ message: 'Upazilla not found' })

        await client.upazilla.delete({ where: { id: id } })

        res.json({ message: 'Upazilla deleted' })
    } catch (err) {
        if (err.code === 'P2003' || err.code === 'P2014') {
            return res.status(409).json({ message: fkConflictMessage('Upazilla') })
        }
        next(err)
    }
}
