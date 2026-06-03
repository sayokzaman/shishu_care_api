var prismaWrapper = require('../lib/prisma')
var bcrypt = require('bcryptjs')
var jwt = require('jsonwebtoken')

var JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_secret'
var JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

exports.register = async function (req, res, next) {
    try {
        var name = req.body.name
        var email = req.body.email
        var password = req.body.password

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'name, email and password are required' })
        }

        var client = prismaWrapper && prismaWrapper._getClient()
        if (!client) return res.status(500).json({ message: 'Prisma client is not available' })

        var existing = await client.user.findUnique({ where: { email: email } })
        if (existing) {
            return res.status(409).json({ message: 'Email already in use' })
        }

        var hash = await bcrypt.hash(password, 10)

        var user = await client.user.create({ data: { name: name, email: email, password: hash } })

        var token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

        res.status(201).json({ token: token, user: { id: user.id, name: user.name, email: user.email } })
    } catch (err) {
        next(err)
    }
}

exports.login = async function (req, res, next) {
    try {
        var email = req.body.email
        var password = req.body.password

        if (!email || !password) {
            return res.status(400).json({ message: 'email and password are required' })
        }

        var client = prismaWrapper && prismaWrapper._getClient()
        if (!client) return res.status(500).json({ message: 'Prisma client is not available' })

        var user = await client.user.findUnique({ where: { email: email } })
        if (!user || !user.password) {
            return res.status(401).json({ message: 'Invalid credentials' })
        }

        var ok = await bcrypt.compare(password, user.password)
        if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

        var token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

        res.json({ token: token, user: { id: user.id, name: user.name, email: user.email } })
    } catch (err) {
        next(err)
    }
}
