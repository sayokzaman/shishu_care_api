var jwt = require('jsonwebtoken')

var JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_secret'

exports.required = async function (req, res, next) {
  var authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing Authorization header' })
  }

  var token = authHeader.slice(7)
  try {
    var payload = jwt.verify(token, JWT_SECRET)
    // attach minimal user info
    req.user = { id: payload.sub }
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

exports.optional = function (req, res, next) {
  var authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next()

  var token = authHeader.slice(7)
  try {
    var payload = jwt.verify(token, JWT_SECRET)
    req.user = { id: payload.sub }
  } catch (err) {}
  next()
}
