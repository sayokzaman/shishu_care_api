async function seedGrowth(prisma) {
    var existing = await prisma.growthMeasurement.count()
    // onboarding seeder may have already created measurements — only skip if > 2 exist
    if (existing > 2) {
        console.log('  [growth] already seeded, skipping')
        return
    }

    var user = await prisma.user.findFirst({ where: { phone: '01711000002' } })
    if (!user) { console.log('  [growth] seed user not found, skipping'); return }

    var parent = await prisma.parent.findUnique({ where: { userId: user.id } })
    if (!parent) { console.log('  [growth] parent not found, skipping'); return }

    var child = await prisma.child.findFirst({ where: { parentId: parent.id }, orderBy: { createdAt: 'desc' } })
    if (!child) { console.log('  [growth] child not found, skipping'); return }

    function ageDays(dob, at) {
        return Math.floor((at - new Date(dob)) / (24 * 60 * 60 * 1000))
    }

    var dob = child.dateOfBirth || new Date(Date.now() - 240 * 24 * 60 * 60 * 1000)

    function monthsAgo(n) {
        var d = new Date()
        d.setMonth(d.getMonth() - n)
        d.setHours(10, 0, 0, 0)
        return d
    }

    var records = [
        // birth
        { measuredAt: dob, weightKg: 3.1, heightCm: 50, headCircumferenceCm: 34 },
        // 2 months
        { measuredAt: monthsAgo(6), weightKg: 5.2, heightCm: 57, headCircumferenceCm: 38 },
        // 4 months
        { measuredAt: monthsAgo(4), weightKg: 6.5, heightCm: 62, headCircumferenceCm: 40.5 },
        // 6 months
        { measuredAt: monthsAgo(2), weightKg: 7.4, heightCm: 65, headCircumferenceCm: 42 },
        // current (~8 months)
        { measuredAt: monthsAgo(0), weightKg: 8.2, heightCm: 68, headCircumferenceCm: 44 },
    ]

    for (var r of records) {
        var exists = await prisma.growthMeasurement.findFirst({
            where: { childId: child.id, measuredAt: r.measuredAt }
        })
        if (exists) continue
        await prisma.growthMeasurement.create({
            data: {
                childId:             child.id,
                measuredBy:          user.id,
                measuredAt:          r.measuredAt,
                ageDays:             ageDays(dob, r.measuredAt),
                weightKg:            r.weightKg,
                heightCm:            r.heightCm,
                headCircumferenceCm: r.headCircumferenceCm,
            }
        })
    }
    console.log(`  [growth] seeded ${records.length} measurements for ${child.fullNameBn}`)
}

module.exports = { seedGrowth }
