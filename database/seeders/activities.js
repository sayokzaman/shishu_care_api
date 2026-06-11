async function seedActivities(prisma) {
    var existing = await prisma.activitySession.count()
    if (existing > 0) {
        console.log('  [activities] already seeded, skipping')
        return
    }

    var user = await prisma.user.findFirst({ where: { phone: '01711000002' } })
    if (!user) { console.log('  [activities] seed user not found, skipping'); return }

    var parent = await prisma.parent.findUnique({ where: { userId: user.id } })
    if (!parent) { console.log('  [activities] parent not found, skipping'); return }

    var child = await prisma.child.findFirst({ where: { parentId: parent.id }, orderBy: { createdAt: 'desc' } })
    if (!child) { console.log('  [activities] child not found, skipping'); return }

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

    var sessions = [
        // yesterday
        { childId: child.id, loggedBy: user.id, startedAt: at(1, 8, 30), durationMinutes: 10, type: 'tummy_time', notes: 'Lifted head well!' },
        { childId: child.id, loggedBy: user.id, startedAt: at(1, 11, 0), durationMinutes: 20, type: 'play' },
        { childId: child.id, loggedBy: user.id, startedAt: at(1, 17, 0), durationMinutes: 15, type: 'bath' },
        { childId: child.id, loggedBy: user.id, startedAt: at(1, 19, 30), durationMinutes: 10, type: 'massage', notes: 'Baby oil massage before bed' },
        // today
        { childId: child.id, loggedBy: user.id, startedAt: at(0, 8, 0), durationMinutes: 12, type: 'tummy_time' },
        { childId: child.id, loggedBy: user.id, startedAt: at(0, 11, 30), durationMinutes: 30, type: 'outdoor', notes: 'Walk in the garden' },
        { childId: child.id, loggedBy: user.id, startedAt: at(0, 15, 0), durationMinutes: 15, type: 'reading', notes: 'Looked at picture book' },
        { childId: child.id, loggedBy: user.id, startedAt: at(0, 17, 30), durationMinutes: 15, type: 'music', notes: 'Played rhymes, baby kicked along' },
    ]

    for (var s of sessions) {
        await prisma.activitySession.create({ data: s })
    }
    console.log(`  [activities] seeded ${sessions.length} sessions for ${child.fullNameBn}`)
}

module.exports = { seedActivities }
