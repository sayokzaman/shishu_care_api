var prismaWrapper = require('../lib/prisma')

exports.getUsers = async function (req, res, next) {
    try {
        var client = prismaWrapper && prismaWrapper._getClient()
        if (!client) {
            return res.status(500).json({ message: 'Prisma client is not available' })
        }

        var users = await client.user.findMany({ orderBy: { id: 'desc' } })

        res.json({
            users: users.map(function (user) {
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    created_at: user.createdAt
                }
            })
        })
    } catch (error) {
        next(error)
    }
}

exports.createUser = async function (req, res, next) {
    try {
        var name = req.body.name
        var email = req.body.email || null

        if (!name) {
            return res.status(400).json({
                message: 'Name is required'
            })
        }

        var client = prismaWrapper && prismaWrapper._getClient()
        if (!client) {
            return res.status(500).json({ message: 'Prisma client is not available' })
        }

        var user = await client.user.create({ data: { name: name, email: email } })

        res.status(201).json({
            message: 'User saved',
            user: {
                id: user.id,
                name: name,
                email: email,
                created_at: user.createdAt
            }
        })
    } catch (error) {
        next(error)
    }
}
