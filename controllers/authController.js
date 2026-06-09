var prismaWrapper = require('../lib/prisma')
var bcrypt = require('bcryptjs')
var jwt = require('jsonwebtoken')

var JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_secret'
var JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

exports.register = async function (req, res, next) {
    try {
        var fullNameEn = req.body.fullNameEn || req.body.name
        var fullNameBn = req.body.fullNameBn || null
        var phone = req.body.phone
        var email = req.body.email || null
        var password = req.body.password
        var role = req.body.role === 'health_worker' ? 'health_worker' : 'parent'

        if (!fullNameEn || !phone || !password) {
            return res.status(400).json({ message: 'fullNameEn, phone and password are required' })
        }

        var client = prismaWrapper && prismaWrapper._getClient()
        if (!client) return res.status(500).json({ message: 'Prisma client is not available' })

        var existing = await client.user.findUnique({ where: { phone: phone } })
        if (existing) {
            return res.status(409).json({ message: 'Phone number already registered' })
        }

        var hash = await bcrypt.hash(password, 10)

        var user = await client.user.create({
            data: { fullNameEn: fullNameEn, fullNameBn: fullNameBn, phone: phone, email: email, password: hash, role: role }
        })

        var token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

        res.status(201).json({ token: token, user: _publicUser(user) })
    } catch (err) {
        next(err)
    }
}

exports.login = async function (req, res, next) {
    try {
        var phone = req.body.phone
        var password = req.body.password

        if (!phone || !password) {
            return res.status(400).json({ message: 'phone and password are required' })
        }

        var client = prismaWrapper && prismaWrapper._getClient()
        if (!client) return res.status(500).json({ message: 'Prisma client is not available' })

        var user = await client.user.findUnique({ where: { phone: phone } })
        if (!user || !user.password) {
            return res.status(401).json({ message: 'Invalid credentials' })
        }

        var ok = await bcrypt.compare(password, user.password)
        if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

        var token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

        res.json({ token: token, user: _publicUser(user) })
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
