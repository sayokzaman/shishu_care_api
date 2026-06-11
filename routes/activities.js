var express = require('express')
var router = express.Router()
var requireAuth = require('../middleware/auth')
var validate = require('../middleware/validate')
var { createSessionSchema } = require('../validators/activityValidator')
var activityCtrl = require('../controllers/activityController')

router.use(requireAuth)

router.get('/sessions', activityCtrl.listSessions)
router.post('/sessions', validate(createSessionSchema), activityCtrl.createSession)

module.exports = router
