// Demo feeding data for Sumaiya Begum's 8-month-old (complementary feeding phase).
// Creates Parent + Child records if they don't exist, then seeds 3 days of sessions.

function at(daysAgo, hour, minute) {
    var d = new Date()
    d.setDate(d.getDate() - daysAgo)
    d.setHours(hour, minute, 0, 0)
    return d
}

// Realistic 8-month-old daily feeding pattern:
// breastfeed on waking → khichuri breakfast → midday breastfeed → lunch (fish + rice) →
// afternoon breastfeed → fruit snack → evening breastfeed → night breastfeed
function dayTemplate(daysAgo) {
    return [
        {
            fedAt: at(daysAgo, 6, 15),
            method: 'breastfed',
            breastSide: 'left',
            durationMinutes: 14,
            mood: 'happy',
            appetite: 'easy',
            items: [],
        },
        {
            fedAt: at(daysAgo, 8, 30),
            method: 'spoon_fed',
            mood: 'happy',
            appetite: 'easy',
            items: [
                {
                    foodNameBn: 'খিচুড়ি',
                    foodNameEn: 'Khichuri',
                    category: 'mixed_meal',
                    consistency: 'mashed',
                    amountDescription: '4 tablespoons',
                    isNewFood: false,
                    accepted: true,
                },
                {
                    foodNameBn: 'কলা',
                    foodNameEn: 'Banana',
                    category: 'fruits',
                    consistency: 'mashed',
                    amountDescription: 'half a banana',
                    isNewFood: false,
                    accepted: true,
                },
            ],
        },
        {
            fedAt: at(daysAgo, 10, 45),
            method: 'breastfed',
            breastSide: 'right',
            durationMinutes: 12,
            mood: 'happy',
            appetite: 'easy',
            items: [],
        },
        {
            fedAt: at(daysAgo, 13, 0),
            method: 'spoon_fed',
            mood: 'happy',
            appetite: 'moderate',
            items: [
                {
                    foodNameBn: 'নরম ভাত',
                    foodNameEn: 'Soft Rice',
                    category: 'grains_cereals',
                    consistency: 'mashed',
                    amountDescription: '3 tablespoons',
                    isNewFood: false,
                    accepted: true,
                },
                {
                    foodNameBn: 'মাছ (রুই)',
                    foodNameEn: 'Fish (Rui)',
                    category: 'fish',
                    consistency: 'mashed',
                    amountDescription: '1 small piece, deboned',
                    isNewFood: false,
                    accepted: true,
                },
                {
                    foodNameBn: 'মসুর ডাল',
                    foodNameEn: 'Red Lentil Dal',
                    category: 'legumes',
                    consistency: 'liquid',
                    amountDescription: '2 tablespoons',
                    isNewFood: false,
                    accepted: true,
                },
            ],
        },
        {
            fedAt: at(daysAgo, 15, 30),
            method: 'breastfed',
            breastSide: 'both',
            durationMinutes: 16,
            mood: 'happy',
            appetite: 'easy',
            items: [],
        },
        {
            fedAt: at(daysAgo, 17, 0),
            method: 'spoon_fed',
            mood: 'happy',
            appetite: 'easy',
            items: [
                {
                    foodNameBn: 'মিষ্টি আলু',
                    foodNameEn: 'Sweet Potato',
                    category: 'vegetables',
                    consistency: 'mashed',
                    amountDescription: '2 tablespoons',
                    isNewFood: false,
                    accepted: true,
                },
                {
                    foodNameBn: 'ডিমের কুসুম',
                    foodNameEn: 'Egg Yolk',
                    category: 'egg',
                    consistency: 'mashed',
                    amountDescription: '1 yolk',
                    isNewFood: false,
                    accepted: true,
                },
            ],
        },
        {
            fedAt: at(daysAgo, 19, 30),
            method: 'breastfed',
            breastSide: 'left',
            durationMinutes: 18,
            mood: 'drowsy',
            appetite: 'easy',
            items: [],
        },
        {
            fedAt: at(daysAgo, 22, 0),
            method: 'breastfed',
            breastSide: 'right',
            durationMinutes: 10,
            mood: 'drowsy',
            appetite: 'easy',
            items: [],
        },
    ]
}

// Yesterday includes a mild reaction note to test those fields
function yesterdayExtra(sessions) {
    var lunch = sessions.find(function (s) {
        return s.method === 'spoon_fed' && s.fedAt.getHours() === 13
    })
    if (lunch) {
        lunch.notes = 'Baby was a bit fussy mid-meal — distracted by noise outside.'
        lunch.appetite = 'moderate'
    }
    return sessions
}

// A session 2 days ago where a new food was introduced
function twoDaysAgoExtra(sessions) {
    var snack = sessions.find(function (s) {
        return s.method === 'spoon_fed' && s.fedAt.getHours() === 17
    })
    if (snack && snack.items && snack.items.length > 0) {
        snack.items.push({
            foodNameBn: 'পেঁপে',
            foodNameEn: 'Papaya',
            category: 'fruits',
            consistency: 'mashed',
            amountDescription: '1 tablespoon',
            isNewFood: true,
            accepted: true,
            reaction: 'Accepted well — no rash or discomfort observed.',
        })
    }
    return sessions
}

async function seedFeeding(prisma) {
    console.log('Seeding demo feeding sessions...')

    var existing = await prisma.feedingSession.count()
    if (existing > 0) {
        console.log('  Feeding sessions already seeded (' + existing + ' found), skipping.')
        return
    }

    // Find demo parent user
    var user = await prisma.user.findUnique({ where: { phone: '01711000002' } })
    if (!user) {
        console.log('  Demo parent user not found — run seedUsers first.')
        return
    }

    // Find a valid location (use first available upazilla)
    var upazilla = await prisma.upazilla.findFirst({ include: { district: { include: { division: true } } } })
    if (!upazilla) {
        console.log('  No locations found — run seedLocations first.')
        return
    }

    // Find or create Parent record for this user
    var parent = await prisma.parent.findUnique({ where: { userId: user.id } })
    if (!parent) {
        parent = await prisma.parent.create({
            data: {
                userId: user.id,
                isPregnant: false,
                upazillaId: upazilla.id,
                districtId: upazilla.districtId,
                divisionId: upazilla.district.divisionId,
            },
        })
        console.log('  ✓ Created parent record for ' + user.fullNameEn)
    }

    // Find or create demo child (~8 months old)
    var child = await prisma.child.findFirst({ where: { parentId: parent.id } })
    if (!child) {
        var dob = new Date()
        dob.setMonth(dob.getMonth() - 8)
        child = await prisma.child.create({
            data: {
                parentId: parent.id,
                fullNameBn: 'আয়ান',
                fullNameEn: 'Aayan',
                gender: 'male',
                dateOfBirth: dob,
                isBreastfed: true,
                upazillaId: upazilla.id,
                districtId: upazilla.districtId,
                divisionId: upazilla.district.divisionId,
            },
        })
        console.log('  ✓ Created child: ' + child.fullNameEn + ' (8 months old)')
    }

    // Build sessions: today (morning only) + yesterday (full) + 2 days ago (full)
    var todaySessions = dayTemplate(0).slice(0, 3) // just waking feed + breakfast + mid-morning
    var yesterdaySessions = yesterdayExtra(dayTemplate(1))
    var twoDaysAgoSessions = twoDaysAgoExtra(dayTemplate(2))
    var allSessions = [].concat(twoDaysAgoSessions, yesterdaySessions, todaySessions)

    var sessionCount = 0
    var itemCount = 0

    for (var session of allSessions) {
        var created = await prisma.feedingSession.create({
            data: {
                childId: child.id,
                loggedBy: user.id,
                fedAt: session.fedAt,
                method: session.method,
                breastSide: session.breastSide || null,
                durationMinutes: session.durationMinutes || null,
                amountMl: session.amountMl || null,
                mood: session.mood || null,
                appetite: session.appetite || null,
                vomitedAfter: session.vomitedAfter || false,
                choked: session.choked || false,
                allergicReaction: session.allergicReaction || false,
                notes: session.notes || null,
                items: {
                    create: (session.items || []).map(function (item) {
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
        sessionCount++
        itemCount += created.items.length
    }

    console.log('  Sessions : ' + sessionCount)
    console.log('  Items    : ' + itemCount)
}

module.exports = { seedFeeding }
