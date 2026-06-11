var jwt = require('jsonwebtoken')

var JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_secret'

function requireAuth(req, res, next) {
    var authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication required' })
    }
    var token = authHeader.slice(7)
    try {
        var payload = jwt.verify(token, JWT_SECRET)
        req.userId = payload.sub
        next()
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' })
    }
}

module.exports = requireAuth
