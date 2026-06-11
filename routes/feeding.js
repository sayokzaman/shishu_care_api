var express = require('express')
var router = express.Router()
var requireAuth = require('../middleware/auth')
var validate = require('../middleware/validate')
var { createSessionSchema } = require('../validators/feedingValidator')
var feedingCtrl = require('../controllers/feedingController')

function logBody(req, res, next) {
    console.log('Request body:', req.body)
    next()
}

router.use(requireAuth)

router.get('/sessions', logBody, feedingCtrl.listSessions)
router.post('/sessions', validate(createSessionSchema), feedingCtrl.createSession)

module.exports = router
