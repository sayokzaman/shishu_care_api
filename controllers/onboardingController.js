var prismaWrapper = require('../lib/prisma')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(earlier, later) {
    return Math.floor((later - earlier) / (24 * 60 * 60 * 1000))
}

function yearsBetween(earlier, later) {
    return Math.floor((later - earlier) / (365.25 * 24 * 60 * 60 * 1000))
}

async function getParentOrFail(client, userId, res) {
    var user = await client.user.findUnique({ where: { id: parseInt(userId) } })
    if (!user) { res.status(404).json({ message: 'User not found' }); return null }
    if (user.role !== 'parent') { res.status(403).json({ message: 'Only parents can complete onboarding' }); return null }

    var parent = await client.parent.findUnique({ where: { userId: parseInt(userId) } })
    if (!parent) { res.status(404).json({ message: 'Parent profile not found' }); return null }

    return parent
}

// ─── POST /api/onboarding/prenatal ────────────────────────────────────────────
// Screen: Onboarding - Prenatal
// 1. Updates parent with weight + pregnancy duration.
// 2. Creates ParentHealthCondition rows for each selected/entered condition.
// 3. Creates the unborn child record.
// Requires: parent.is_pregnant = true

exports.completePrenatal = async function (req, res, next) {
    try {
        var { expectedDeliveryDate, pregnancyDuration, weight, healthConditions, babyNickname, gender } = req.body
        var client = prismaWrapper._getClient()

        var parent = await getParentOrFail(client, req.userId, res)
        if (!parent) return

        var edd = new Date(expectedDeliveryDate)

        var motherAgeAtEdd = null
        if (parent.dateOfBirth) {
            motherAgeAtEdd = yearsBetween(new Date(parent.dateOfBirth), edd)
        }

        var result = await client.$transaction(async function (tx) {
            await tx.parent.update({
                where: { userId: req.userId },
                data: {
                    isPregnant: true,
                    pregnancyDuration: pregnancyDuration !== undefined ? pregnancyDuration : parent.pregnancyDuration,
                    weight: weight !== undefined ? weight : parent.weight
                }
            })

            // One row per condition chip / free-text entry
            var savedConditions = []
            if (healthConditions && healthConditions.length > 0) {
                savedConditions = await Promise.all(
                    healthConditions.map(function (c) {
                        return tx.parentHealthCondition.create({
                            data: {
                                parentId: parent.id,
                                name: c.name,
                                description: c.description || null
                            }
                        })
                    })
                )
            }

            var child = await tx.child.create({
                data: {
                    parentId: parent.id,
                    fullNameBn: babyNickname,
                    gender,
                    expectedDeliveryDate: edd,
                    motherAgeAtEdd,
                    isBreastfed: false,
                    upazillaId: parent.upazillaId,
                    districtId: parent.districtId,
                    divisionId: parent.divisionId
                }
            })

            return { child, healthConditions: savedConditions }
        })

        res.status(201).json(result)
    } catch (err) {
        next(err)
    }
}

// ─── POST /api/onboarding/postnatal ───────────────────────────────────────────
// Screen: Onboarding - Postnatal
// 1. Creates the born child record.
// 2. Creates an IllnessRecord for each known condition (disease present at birth).
// 3. Creates a current growth measurement (weight + height).
// 4. Optionally creates a birth-weight-only measurement at age_days = 0.
// Requires: parent.is_pregnant = false

exports.completePostnatal = async function (req, res, next) {
    try {
        var {
            fullNameBn, fullNameEn, dateOfBirth, gender,
            currentWeightKg, currentHeightCm, birthWeightKg,
            knownConditions, guardianName,
            districtId, upazillaId
        } = req.body
        var client = prismaWrapper._getClient()

        var parent = await getParentOrFail(client, req.userId, res)
        if (!parent) return

        var dob = new Date(dateOfBirth)
        var now = new Date()
        var ageDays = daysBetween(dob, now)

        var childDistrictId = districtId || parent.districtId
        var childUpazillaId = upazillaId || parent.upazillaId

        // Derive division from district when child's district differs from parent's
        var childDivisionId = parent.divisionId
        if (districtId && districtId !== parent.districtId) {
            var district = await client.district.findUnique({ where: { id: districtId } })
            if (!district) return res.status(400).json({ message: 'Invalid districtId' })
            childDivisionId = district.divisionId
        }

        var result = await client.$transaction(async function (tx) {
            await tx.parent.update({
                where: { userId: req.userId },
                data: { isPregnant: false }
            })

            if (guardianName) {
                await tx.user.update({
                    where: { id: req.userId },
                    data: { fullNameBn: guardianName }
                })
            }

            var child = await tx.child.create({
                data: {
                    parentId: parent.id,
                    fullNameBn,
                    fullNameEn: fullNameEn || null,
                    gender,
                    dateOfBirth: dob,
                    isBreastfed: false,
                    upazillaId: childUpazillaId,
                    districtId: childDistrictId,
                    divisionId: childDivisionId
                }
            })

            // One IllnessRecord per known condition (recorded at date of birth)
            var illnessRecords = []
            if (knownConditions && knownConditions.length > 0) {
                illnessRecords = await Promise.all(
                    knownConditions.map(function (c) {
                        return tx.illnessRecord.create({
                            data: {
                                childId: child.id,
                                recordedBy: req.userId,
                                recordedAt: dob,
                                disease: c.name,
                                notes: c.description || null,
                                resolved: false
                            }
                        })
                    })
                )
            }

            // Current growth measurement
            var currentMeasurement = await tx.growthMeasurement.create({
                data: {
                    childId: child.id,
                    measuredBy: req.userId,
                    measuredAt: now,
                    ageDays,
                    weightKg: currentWeightKg,
                    heightCm: currentHeightCm
                }
            })

            // Birth weight at day 0 — height_cm = 0 (not collected in onboarding UI)
            var birthMeasurement = null
            if (birthWeightKg) {
                birthMeasurement = await tx.growthMeasurement.create({
                    data: {
                        childId: child.id,
                        measuredBy: req.userId,
                        measuredAt: dob,
                        ageDays: 0,
                        weightKg: birthWeightKg,
                        heightCm: 0
                    }
                })
            }

            return { child, illnessRecords, currentMeasurement, birthMeasurement }
        })

        res.status(201).json(result)
    } catch (err) {
        next(err)
    }
}
