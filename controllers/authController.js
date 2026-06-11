var prismaWrapper = require('../lib/prisma')
var bcrypt = require('bcryptjs')
var jwt = require('jsonwebtoken')

var JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_secret'
var JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

exports.register = async function (req, res, next) {
    try {
        var { phone, fullNameBn, fullNameEn, password, role, upazillaId, districtId, divisionId, dateOfBirth } = req.body

        var client = prismaWrapper && prismaWrapper._getClient()
        if (!client) return res.status(500).json({ message: 'Prisma client is not available' })

        var existing = await client.user.findUnique({ where: { phone: phone } })
        if (existing) {
            return res.status(409).json({ message: 'Phone number already registered' })
        }

        var hash = await bcrypt.hash(password, 10)

        var locationIds = { upazillaId, districtId, divisionId }

        var user = await client.$transaction(async function (tx) {
            var newUser = await tx.user.create({
                data: { phone, fullNameBn, fullNameEn: fullNameEn || null, password: hash, role }
            })

            if (role === 'parent') {
                await tx.parent.create({
                    data: {
                        userId: newUser.id,
                        ...locationIds,
                        dateOfBirth: dateOfBirth || null
                    }
                })
            } else if (role === 'health_worker') {
                await tx.healthWorker.create({
                    data: { userId: newUser.id, ...locationIds }
                })
            }

            return newUser
        })

        var token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

        res.status(201).json({ token: token, user: { id: user.id, fullNameBn: user.fullNameBn, fullNameEn: user.fullNameEn, phone: user.phone, role: user.role } })
    } catch (err) {
        next(err)
    }
}

exports.login = async function (req, res, next) {
    try {
        var { phone, password } = req.body

        var client = prismaWrapper && prismaWrapper._getClient()
        if (!client) return res.status(500).json({ message: 'Prisma client is not available' })

        var user = await client.user.findUnique({ where: { phone: phone } })
        if (!user || !user.password) {
            return res.status(401).json({ message: 'Invalid credentials' })
        }

        var ok = await bcrypt.compare(password, user.password)
        if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

        var token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

        res.json({ token: token, user: { id: user.id, fullNameBn: user.fullNameBn, fullNameEn: user.fullNameEn, phone: user.phone, role: user.role } })
    } catch (err) {
        next(err)
    }
}

function _publicUser(user) {
    return {
        id: user.id,
        fullNameEn: user.fullNameEn,
        fullNameBn: user.fullNameBn,
        phone: user.phone,
        email: user.email,
        role: user.role,
    }
}
