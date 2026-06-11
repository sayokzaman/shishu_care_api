async function seedSleep(prisma) {
    var existing = await prisma.sleepSession.count()
    if (existing > 0) {
        console.log('  [sleep] already seeded, skipping')
        return
    }

    // Find Sumaiya's child (Aayan) created by the feeding seeder
    var user = await prisma.user.findFirst({ where: { phone: '01711000002' } })
    if (!user) { console.log('  [sleep] seed user not found, skipping'); return }

    var parent = await prisma.parent.findUnique({ where: { userId: user.id } })
    if (!parent) { console.log('  [sleep] parent not found, skipping'); return }

    var child = await prisma.child.findFirst({ where: { parentId: parent.id }, orderBy: { createdAt: 'desc' } })
    if (!child) { console.log('  [sleep] child not found, skipping'); return }

    var now = new Date()
    function daysAgo(n) {
        var d = new Date(now)
        d.setDate(d.getDate() - n)
        return d
    }
    function at(daysBack, h, m) {
        var d = daysAgo(daysBack)
        d.setHours(h, m, 0, 0)
        return d
    }

    // today: morning nap still ongoing + a completed afternoon nap
    // yesterday: full night + 2 naps
    var sessions = [
        // ── yesterday ──
        {
            childId:   child.id, loggedBy: user.id,
            startedAt: at(1, 20, 30), endedAt: at(0, 5, 15),  // overnight
            type: 'night', quality: 'good',
            location: 'crib', notes: 'Slept through without waking',
        },
        {
            childId:   child.id, loggedBy: user.id,
            startedAt: at(1, 9, 10), endedAt: at(1, 10, 30),
            type: 'nap', quality: 'fair', location: 'arms',
        },
        {
            childId:   child.id, loggedBy: user.id,
            startedAt: at(1, 14, 0), endedAt: at(1, 16, 0),
            type: 'nap', quality: 'good', location: 'crib',
        },
        // ── today ──
        {
            childId:   child.id, loggedBy: user.id,
            startedAt: at(0, 9, 15), endedAt: at(0, 10, 30),
            type: 'nap', quality: 'good', location: 'stroller',
        },
        {
            childId:   child.id, loggedBy: user.id,
            startedAt: at(0, 13, 45), endedAt: null,  // ongoing
            type: 'nap', quality: null, location: 'crib',
        },
    ]

    for (var s of sessions) {
        await prisma.sleepSession.create({ data: s })
    }
    console.log(`  [sleep] seeded ${sessions.length} sessions for ${child.fullNameBn}`)
}

module.exports = { seedSleep }
